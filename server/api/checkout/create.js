/**
 * Serverless Checkout Session Endpoint
 * Creates a Stripe Checkout Session for subscription purchase
 */

const Stripe = require('stripe');
const { PRICE_IDS } = require('../../lib/stripePlans');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, cycle, email, redirectContext } = req.body;

    // Validate input
    if (!plan || !cycle) {
      return res.status(400).json({ error: 'Missing required fields: plan, cycle' });
    }

    if (!['ape', 'degen', 'gigachad'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be: ape, degen, or gigachad' });
    }

    if (!['monthly', 'yearly'].includes(cycle)) {
      return res.status(400).json({ error: 'Invalid cycle. Must be: monthly or yearly' });
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('[Checkout] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({
        error: 'Stripe not configured. Please add STRIPE_SECRET_KEY to environment variables.'
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get price ID
    const priceId = PRICE_IDS[plan][cycle];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan/cycle combination' });
    }

    // Get app URL from environment (fallback to localhost for dev)
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:8083';

    // Build success URL with redirect context
    let successUrl = `${appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`;
    if (redirectContext) {
      if (redirectContext.redirectTo) {
        successUrl += `&redirectTo=${encodeURIComponent(redirectContext.redirectTo)}`;
      }
      if (redirectContext.handle) {
        successUrl += `&handle=${encodeURIComponent(redirectContext.handle)}`;
      }
    }

    // Create Checkout Session options
    const sessionOptions = {
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: `${appUrl}/pay/cancel`,
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
      },
    };

    // Add customer email if provided
    if (email) {
      sessionOptions.customer_email = email;
    }

    // Create Stripe Checkout Session
    console.log('[Checkout] Creating session for:', { plan, cycle, email });
    const session = await stripe.checkout.sessions.create(sessionOptions);

    console.log('[Checkout] Session created:', session.id);

    // Return checkout URL
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('[Checkout] Error creating session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message,
    });
  }
};
