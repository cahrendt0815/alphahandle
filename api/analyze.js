/**
 * POST /api/analyze
 * Vercel serverless function - thin proxy to external analyst API
 * Validates input, forwards to analyst API, returns response.
 * Requires Node 18+ (native fetch). See package.json "engines".
 */

module.exports = async (req, res) => {
  console.log('[Analyze] invoked');
  const send500 = (msg) => {
    try {
      if (res && !res.headersSent) res.status(500).json({ error: 'Internal server error', message: msg || 'Unknown error' });
    } catch (e) {
      console.error('[Analyze] send500 failed:', e);
    }
  };

  if (!req || !res) {
    console.error('[Analyze] req or res missing');
    send500('Invalid request');
    return;
  }

  try {
  if (typeof fetch !== 'function') {
    console.error('[Analyze] fetch is not available (Node < 18?)');
    send500('Server configuration error');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = req.body;
  } catch (bodyErr) {
    console.error('[Analyze] request.body threw:', bodyErr && bodyErr.message);
    res.status(400).json({ error: 'Invalid JSON body', message: bodyErr && bodyErr.message ? String(bodyErr.message) : 'Bad request body' });
    return;
  }
  if (typeof body === 'string') {
    try {
      body = body ? JSON.parse(body) : {};
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  }
  if (!body || typeof body !== 'object') body = {};

  let timeoutId;
  try {
    const { handle, months = 12 } = body;

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

    const headers = {
      'Content-Type': 'application/json',
    };
    if (process.env.STOCK_ANALYSIS_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STOCK_ANALYSIS_API_TOKEN}`;
    } else if (process.env.STOCK_ANALYSIS_API_KEY) {
      headers['X-API-Key'] = process.env.STOCK_ANALYSIS_API_KEY;
    }

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 60000);

    const baseUrl = analystApiUrl.replace(/\?.*$/, '').trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      console.error('[Analyze] Invalid analyst API URL (missing protocol):', baseUrl.substring(0, 50));
      return res.status(500).json({ error: 'Analyst API URL must use http or https' });
    }

    let response;
    let responseText;

    // Try POST with JSON body first (matches analyst Postman; they may only read body)
    const bodyPayload = JSON.stringify({ month: monthsNum, account: cleanHandle });
    console.log('[Analyze] Request: POST with body', bodyPayload);

    response = await fetch(baseUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: bodyPayload,
      signal: controller.signal,
    });
    responseText = await response.text().catch(() => '');

    // Fallback: if POST not allowed, use GET with query params
    if (response.status === 405 || response.status === 404) {
      console.log('[Analyze] POST not supported, retrying GET with query params');
      const urlWithQuery = new URL(baseUrl);
      urlWithQuery.searchParams.set('month', monthsNum.toString());
      urlWithQuery.searchParams.set('account', cleanHandle);
      const res2 = await fetch(urlWithQuery.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      responseText = await res2.text().catch(() => '');
      response = res2;
    }

    if (timeoutId != null) clearTimeout(timeoutId);

    if (!response.ok) {
        console.error(`[Analyze] Analyst API error ${response.status}: ${responseText.substring(0, 300)}`);
        return res.status(502).json({
          error: 'Analyst API error',
          message: `Upstream returned ${response.status}: ${responseText.substring(0, 200)}`,
        });
      }

      let raw;
      try {
        raw = responseText ? JSON.parse(responseText) : null;
      } catch (parseErr) {
        console.error('[Analyze] Analyst API returned non-JSON:', responseText.substring(0, 200));
        return res.status(502).json({
          error: 'Invalid response from analyst API',
          message: 'Response was not valid JSON',
        });
      }
      
      console.log(`[Analyze] Successfully received response from analyst API`);
      console.log(`[Analyze] Response type: ${Array.isArray(raw) ? 'array' : typeof raw}, length: ${Array.isArray(raw) ? raw.length : 'n/a'}`);
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
          if (!item || typeof item !== 'object') {
            return { ticker: '—', company: '—', dateMentioned: '', beginningValue: 0, lastValue: 0, stockReturn: 0, alphaVsSPY: 0, hitOrMiss: 'Miss', tweetUrl: '', tweetText: '' };
          }
          const ticker = Array.isArray(item.cashtag) && item.cashtag[0]
            ? (String(item.cashtag[0]).startsWith('$') ? String(item.cashtag[0]) : `$${item.cashtag[0]}`)
            : '—';
          const stockReturn = typeof item.return === 'number' && !Number.isNaN(item.return) ? item.return : 0;
          const alphaVsSPY = typeof item.alpha === 'number' && !Number.isNaN(item.alpha) ? item.alpha : 0;
          return {
            ticker,
            company: '—',
            dateMentioned: item.created_at != null ? String(item.created_at) : '',
            beginningValue: typeof item.begin === 'number' ? item.begin : 0,
            lastValue: typeof item.last === 'number' ? item.last : 0,
            stockReturn,
            alphaVsSPY,
            hitOrMiss: stockReturn > 0 ? 'Hit' : 'Miss',
            tweetUrl: item.url != null ? String(item.url) : '',
            tweetText: item.text != null ? String(item.text) : '',
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
      if (timeoutId != null) clearTimeout(timeoutId);

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
    const message = error && typeof error.message === 'string' ? error.message : 'Internal server error';
    send500(message);
    return;
  }
};
