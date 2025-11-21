const serverless = require('serverless-http');
const { app, loadCompanies } = require('../simulation/analysisServer');

let initialized = false;
let initializationError = null;

module.exports = async (req, res) => {
	try {
		console.log('[api/analysis] ========== FUNCTION CALLED ==========');
		console.log('[api/analysis] Request method:', req.method);
		console.log('[api/analysis] Request URL:', req.url);
		console.log('[api/analysis] Request path:', req.path);
		console.log('[api/analysis] Request query:', JSON.stringify(req.query));
		console.log('[api/analysis] Request headers:', JSON.stringify(req.headers));
		
		// Initialize companies data (only once)
		if (!initialized) {
			console.log('[api/analysis] Initializing companies data...');
			try {
				await loadCompanies();
				initialized = true;
				console.log('[api/analysis] ✅ Companies data loaded successfully');
			} catch (err) {
				initializationError = err;
				console.error('[api/analysis] ❌ Failed to load companies:', err);
				// Don't exit - let the request continue, but log the error
			}
		}
		
		// Handle path transformation for serverless-http
		// Vercel routes /api/analysis/api/analyze to this function
		// We need to transform it to /api/analyze for Express
		const originalUrl = req.url || req.path || '';
		console.log('[api/analysis] Original URL/path:', originalUrl);
		
		// Transform the path: /api/analysis/api/analyze -> /api/analyze
		let transformedPath = originalUrl;
		if (transformedPath.includes('/api/analysis/api/')) {
			transformedPath = transformedPath.replace('/api/analysis', '');
			console.log('[api/analysis] Path after /api/analysis removal:', transformedPath);
		}
		
		// For serverless-http, we need to modify the request object properly
		// Create a new request-like object with the transformed path
		const transformedReq = {
			...req,
			url: transformedPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''),
			path: transformedPath.split('?')[0],
			originalUrl: req.url,
			baseUrl: '',
			pathname: transformedPath.split('?')[0]
		};
		
		console.log('[api/analysis] Transformed URL:', transformedReq.url);
		console.log('[api/analysis] Transformed path:', transformedReq.path);
		console.log('[api/analysis] About to call serverless(app)...');
		
		// Check environment variables
		if (!process.env.TWITTER_API_KEY && !process.env.TW_BEARER) {
			console.error('[api/analysis] ❌ TWITTER_API_KEY not found in environment');
		} else {
			console.log('[api/analysis] ✅ TWITTER_API_KEY is set');
		}
		
		// Call serverless-http with transformed request
		const handler = serverless(app);
		console.log('[api/analysis] Calling serverless handler...');
		const result = await handler(transformedReq, res);
		console.log('[api/analysis] Serverless handler returned');
		return result;
	} catch (error) {
		console.error('[api/analysis] ❌ Unhandled error:', error);
		console.error('[api/analysis] Error stack:', error.stack);
		res.status(500).json({ 
			error: 'Internal server error', 
			message: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};



