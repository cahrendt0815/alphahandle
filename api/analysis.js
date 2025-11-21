const serverless = require('serverless-http');
const { app, loadCompanies } = require('../simulation/analysisServer');

let initialized = false;

module.exports = async (req, res) => {
	if (!initialized) {
		await loadCompanies();
		initialized = true;
	}
	
	// Strip /api/analysis prefix from path for Express routes
	// Vercel routes /api/analysis/* to this function, but Express expects /api/analyze
	if (req.url && req.url.startsWith('/api/analysis')) {
		req.url = req.url.replace('/api/analysis', '');
		// Ensure path starts with /
		if (!req.url.startsWith('/')) {
			req.url = '/' + req.url;
		}
	}
	
	return serverless(app)(req, res);
};



