const serverless = require('serverless-http');
const { app, loadCompanies } = require('../simulation/analysisServer');

let initialized = false;

module.exports = async (req, res) => {
	console.log('[api/analysis] ========== FUNCTION CALLED ==========');
	console.log('[api/analysis] Method:', req.method);
	console.log('[api/analysis] Original URL:', req.url);
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
		// Vercel passes the full path, we need to strip /api/analysis prefix
		const originalUrl = req.url || '';
		let transformedUrl = originalUrl;
		
		if (originalUrl.includes('/api/analysis/api/')) {
			transformedUrl = originalUrl.replace('/api/analysis', '');
			console.log('[api/analysis] Path transformed:', originalUrl, '->', transformedUrl);
		} else if (originalUrl.startsWith('/api/analysis/')) {
			transformedUrl = originalUrl.replace('/api/analysis', '');
			console.log('[api/analysis] Path transformed:', originalUrl, '->', transformedUrl);
		}
		
		// Modify req object for serverless-http
		// serverless-http reads from req.url, so we need to modify it
		const originalReqUrl = req.url;
		req.url = transformedUrl;
		req.path = transformedUrl.split('?')[0];
		req.originalUrl = originalReqUrl;
		
		console.log('[api/analysis] Modified req.url:', req.url);
		console.log('[api/analysis] Modified req.path:', req.path);
		console.log('[api/analysis] About to call serverless(app)...');
		
		// Use serverless-http to handle the Express app
		const handler = serverless(app, {
			request: (request, event, context) => {
				// Ensure the path is correct
				request.url = transformedUrl;
				request.path = transformedUrl.split('?')[0];
			}
		});
		
		console.log('[api/analysis] Calling handler...');
		return handler(req, res);
		
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



