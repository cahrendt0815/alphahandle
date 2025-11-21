const serverless = require('serverless-http');
const { app, loadCompanies } = require('../simulation/analysisServer');

let initialized = false;
let initializationError = null;

module.exports = async (req, res) => {
	try {
		console.log('[api/analysis] Request received:', req.method, req.url);
		console.log('[api/analysis] Headers:', JSON.stringify(req.headers));
		
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
		
		// Strip /api/analysis prefix from path for Express routes
		// Vercel routes /api/analysis/* to this function, but Express expects /api/analyze
		const originalUrl = req.url;
		console.log('[api/analysis] Original URL:', originalUrl);
		console.log('[api/analysis] Original path:', req.path);
		
		if (req.url && req.url.startsWith('/api/analysis')) {
			req.url = req.url.replace('/api/analysis', '');
			// Ensure path starts with /
			if (!req.url.startsWith('/')) {
				req.url = '/' + req.url;
			}
			console.log('[api/analysis] Path transformed:', originalUrl, '->', req.url);
		} else {
			console.log('[api/analysis] ⚠️ URL does not start with /api/analysis, not transforming');
		}
		
		// Also update req.path for Express routing
		if (req.path && req.path.startsWith('/api/analysis')) {
			req.path = req.path.replace('/api/analysis', '');
			if (!req.path.startsWith('/')) {
				req.path = '/' + req.path;
			}
			console.log('[api/analysis] Path also updated:', req.path);
		}
		
		// Check for initialization error
		if (initializationError) {
			console.warn('[api/analysis] ⚠️ Initialization error present, but continuing...');
		}
		
		// Check environment variables
		if (!process.env.TWITTER_API_KEY && !process.env.TW_BEARER) {
			console.error('[api/analysis] ❌ TWITTER_API_KEY not found in environment');
		} else {
			console.log('[api/analysis] ✅ TWITTER_API_KEY is set');
		}
		
		return serverless(app)(req, res);
	} catch (error) {
		console.error('[api/analysis] ❌ Unhandled error:', error);
		res.status(500).json({ 
			error: 'Internal server error', 
			message: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
};



