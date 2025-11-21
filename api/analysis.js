const { app, loadCompanies } = require('../simulation/analysisServer');
const serverless = require('serverless-http');

let initialized = false;

// Create serverless handler once
const handler = serverless(app);

module.exports = async (req, res) => {
	console.log('[api/analysis] ========== FUNCTION CALLED ==========');
	console.log('[api/analysis] Method:', req.method);
	console.log('[api/analysis] Original URL:', req.url);
	console.log('[api/analysis] Original path:', req.path);
	console.log('[api/analysis] Query:', JSON.stringify(req.query));
	
	try {
		// Initialize companies data (only once)
		if (!initialized) {
			console.log('[api/analysis] Initializing companies...');
			try {
				await loadCompanies();
				initialized = true;
				console.log('[api/analysis] ✅ Companies loaded');
			} catch (err) {
				console.error('[api/analysis] ❌ Failed to load companies:', err);
			}
		}
		
		// Transform path: /api/analysis/api/analyze -> /api/analyze
		const originalUrl = req.url || req.path || '';
		let newUrl = originalUrl;
		
		// Strip /api/analysis prefix if present
		if (originalUrl.includes('/api/analysis/')) {
			newUrl = originalUrl.replace(/^\/api\/analysis/, '');
			if (!newUrl.startsWith('/')) {
				newUrl = '/' + newUrl;
			}
			console.log('[api/analysis] Path transformed:', originalUrl, '->', newUrl);
		}
		
		// Create a new request object with transformed URL
		// serverless-http needs the URL to match Express routes
		const modifiedReq = Object.create(req);
		modifiedReq.url = newUrl;
		modifiedReq.path = newUrl.split('?')[0];
		modifiedReq.originalUrl = originalUrl;
		
		console.log('[api/analysis] Calling serverless handler with URL:', modifiedReq.url);
		
		// Call the serverless handler
		return handler(modifiedReq, res);
		
	} catch (error) {
		console.error('[api/analysis] ❌ Error:', error);
		console.error('[api/analysis] Stack:', error.stack);
		if (!res.headersSent) {
			res.status(500).json({ 
				error: 'Internal server error', 
				message: error.message
			});
		}
	}
};



