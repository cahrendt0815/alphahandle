/**
 * Local Development Server
 * Runs serverless functions locally for development
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Import serverless functions
const checkoutCreate = require('./api/checkout/create');
const stripeWebhook = require('./api/stripe/webhook');
const billingPortal = require('./api/billing/portal');
const billingInvoices = require('./api/billing/invoices');
const searchProcess = require('./api/search/process');

// Helper to wrap serverless functions for Express
const wrapServerless = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Routes
// Webhook route MUST come before express.json() to get raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), wrapServerless(stripeWebhook));

// Other routes use JSON parsing
app.use(express.json());
app.post('/api/checkout/create', wrapServerless(checkoutCreate));
app.post('/api/billing/portal', wrapServerless(billingPortal));
app.get('/api/billing/invoices', wrapServerless(billingInvoices));
app.post('/api/search/process', wrapServerless(searchProcess));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Available routes:`);
  console.log(`   POST http://localhost:${PORT}/api/checkout/create`);
  console.log(`   POST http://localhost:${PORT}/api/stripe/webhook`);
  console.log(`   POST http://localhost:${PORT}/api/billing/portal`);
  console.log(`   GET  http://localhost:${PORT}/api/billing/invoices`);
  console.log(`   POST http://localhost:${PORT}/api/search/process`);
  console.log(`   GET  http://localhost:${PORT}/health`);
});

module.exports = app;
