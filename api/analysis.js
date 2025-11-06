const serverless = require('serverless-http');
const { app, loadCompanies } = require('../simulation/analysisServer');

let initialized = false;

module.exports = async (req, res) => {
	if (!initialized) {
		await loadCompanies();
		initialized = true;
	}
	return serverless(app)(req, res);
};
