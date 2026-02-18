/**
 * POST /api/analyze
 * Thin proxy to external analyst API
 * 
 * Validates input, forwards to analyst API, returns response
 */

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { handle, months = 12 } = req.body;

    // Validate input
    if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid handle parameter' });
    }

    // Clean handle (remove @ if present)
    const cleanHandle = handle.replace(/^@/, '').trim();
    
    if (cleanHandle.length === 0 || cleanHandle.length > 15) {
      return res.status(400).json({ error: 'Invalid handle format' });
    }

    // Validate months
    const monthsNum = parseInt(months, 10);
    if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 36) {
      return res.status(400).json({ error: 'Months must be between 1 and 36' });
    }

    // Get analyst API URL from environment
    const analystApiUrl = process.env.EXPO_PUBLIC_STOCK_ANALYSIS_API_URL || process.env.STOCK_ANALYSIS_API_URL;
    
    if (!analystApiUrl) {
      console.error('[Analyze] STOCK_ANALYSIS_API_URL not configured');
      return res.status(500).json({ error: 'Analyst API not configured' });
    }

    // Analyst API expects GET with JSON body (month, account) per Postman example
    const baseUrl = analystApiUrl.replace(/\?.*$/, '').trim();
    const bodyPayload = JSON.stringify({ month: monthsNum, account: cleanHandle });
    console.log(`[Analyze] Forwarding request to analyst API: GET ${baseUrl} body=${bodyPayload}`);

    const headers = {
      'Content-Type': 'application/json',
    };
    if (process.env.STOCK_ANALYSIS_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STOCK_ANALYSIS_API_TOKEN}`;
    } else if (process.env.STOCK_ANALYSIS_API_KEY) {
      headers['X-API-Key'] = process.env.STOCK_ANALYSIS_API_KEY;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers,
        body: bodyPayload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle errors from analyst API
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[Analyze] Analyst API error ${response.status}: ${errorText.substring(0, 200)}`);
        
        // Forward status code and error
        return res.status(response.status).json({
          error: `Analyst API error: ${response.status}`,
          message: errorText.substring(0, 500),
        });
      }

      // Parse and normalize response
      const raw = await response.json();
      
      console.log(`[Analyze] Successfully received response from analyst API`);
      console.log(`[Analyze] Response type: ${Array.isArray(raw) ? 'array' : typeof raw}`);
      console.log(
        `[Analyze] Response keys: ${
          raw && typeof raw === 'object' && !Array.isArray(raw)
            ? Object.keys(raw).join(', ')
            : 'N/A'
        }`
      );

      let data = raw;

      // If service returns an array (analyst API format), map to our app trade shape and add stats
      if (Array.isArray(raw)) {
        console.log('[Analyze] Mapping analyst array response to app trade format');

        const mappedTrades = raw.map((item) => {
          const ticker = Array.isArray(item.cashtag) && item.cashtag[0]
            ? (item.cashtag[0].startsWith('$') ? item.cashtag[0] : `$${item.cashtag[0]}`)
            : '—';
          const stockReturn = typeof item.return === 'number' && !Number.isNaN(item.return) ? item.return : 0;
          const alphaVsSPY = typeof item.alpha === 'number' && !Number.isNaN(item.alpha) ? item.alpha : 0;
          return {
            ticker,
            company: '—',
            dateMentioned: item.created_at || '',
            beginningValue: typeof item.begin === 'number' ? item.begin : 0,
            lastValue: typeof item.last === 'number' ? item.last : 0,
            stockReturn,
            alphaVsSPY,
            hitOrMiss: stockReturn > 0 ? 'Hit' : 'Miss',
            tweetUrl: item.url || '',
            tweetText: item.text || '',
          };
        });

        const totalTrades = mappedTrades.length;
        const returns = mappedTrades
          .map(t => t.stockReturn)
          .filter(v => typeof v === 'number' && !Number.isNaN(v));
        const avgReturn = returns.length > 0
          ? parseFloat((returns.reduce((a, b) => a + b, 0) / returns.length).toFixed(2))
          : 0;
        const alpha = returns.length > 0
          ? parseFloat((returns.reduce((a, b) => a + b, 0) / returns.length - 0).toFixed(2))
          : 0;
        const winners = mappedTrades.filter(t => t.stockReturn > 0).length;
        const winRate = totalTrades > 0 ? parseFloat(((winners / totalTrades) * 100).toFixed(1)) : 0;
        const hitRatio = totalTrades > 0 ? parseFloat((mappedTrades.filter(t => t.alphaVsSPY > 0).length / totalTrades * 100).toFixed(1)) : 0;

        data = {
          trades: mappedTrades,
          stats: {
            avgReturn,
            alpha,
            winRate,
            hitRatio,
            totalTrades,
          },
        };
      } else if (!raw || typeof raw !== 'object') {
        console.error('[Analyze] Analyst API returned invalid data type:', typeof raw);
        return res.status(502).json({
          error: 'Invalid response format from analyst API',
          message: 'Analyst API returned invalid data type',
        });
      }

      return res.status(200).json(data);

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('[Analyze] Request timeout');
        return res.status(504).json({ error: 'Request timeout - analyst API took too long to respond' });
      }

      if (fetchError.message && (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ECONNREFUSED'))) {
        console.error('[Analyze] Network error:', fetchError.message);
        return res.status(502).json({ error: 'Cannot connect to analyst API' });
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('[Analyze] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};
