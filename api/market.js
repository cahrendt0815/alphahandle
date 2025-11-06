const fetch = require('node-fetch');

const UPSTREAM = process.env.MARKET_UPSTREAM_URL || process.env.NEXT_PUBLIC_MARKET_BASE_URL || process.env.EXPO_PUBLIC_MARKET_BASE_URL || '';

module.exports = async (req, res) => {
	if (!UPSTREAM) {
		res.status(500).json({ error: 'MARKET_UPSTREAM_URL not configured' });
		return;
	}
	try {
		const url = new URL(req.url, 'http://localhost');
		const path = url.pathname.replace(/^\/api\/market/, '');
		const target = `${UPSTREAM}${path}${url.search}`;
		const init = {
			method: req.method,
			headers: { ...req.headers },
			body: ['GET','HEAD'].includes(req.method) ? undefined : req,
		};
		const upstreamRes = await fetch(target, init);
		res.status(upstreamRes.status);
		upstreamRes.headers.forEach((v, k) => {
			if (k.toLowerCase() !== 'transfer-encoding') res.setHeader(k, v);
		});
		const buf = await upstreamRes.buffer();
		res.end(buf);
	} catch (e) {
		console.error('[api/market] proxy error', e);
		res.status(502).json({ error: 'Bad gateway' });
	}
};
