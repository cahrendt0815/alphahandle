/**
 * POST /api/analyze
 * Vercel serverless function - thin proxy to external analyst API
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

    // Build analyst API URL
    const url = new URL(analystApiUrl);
    url.searchParams.set('handle', cleanHandle);
    url.searchParams.set('months', monthsNum.toString());

    console.log(`[Analyze] Forwarding request to analyst API: ${url.toString()}`);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication if available
    if (process.env.STOCK_ANALYSIS_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.STOCK_ANALYSIS_API_TOKEN}`;
    } else if (process.env.STOCK_ANALYSIS_API_KEY) {
      headers['X-API-Key'] = process.env.STOCK_ANALYSIS_API_KEY;
    }

    // Forward request to analyst API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
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

      // Parse and return response
      const data = await response.json();
      
      console.log(`[Analyze] Successfully received response from analyst API`);
      console.log(`[Analyze] Response type: ${Array.isArray(data) ? 'array' : typeof data}`);
      console.log(`[Analyze] Response keys: ${typeof data === 'object' && !Array.isArray(data) ? Object.keys(data).join(', ') : 'N/A'}`);
      
      // Validate response structure
      if (Array.isArray(data)) {
        console.error('[Analyze] Analyst API returned array instead of object. Expected { trades, stats }');
        return res.status(502).json({ 
          error: 'Invalid response format from analyst API',
          message: 'Analyst API returned an array instead of expected object format'
        });
      }
      
      if (!data || typeof data !== 'object') {
        console.error('[Analyze] Analyst API returned invalid data type:', typeof data);
        return res.status(502).json({ 
          error: 'Invalid response format from analyst API',
          message: 'Analyst API returned invalid data type'
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
