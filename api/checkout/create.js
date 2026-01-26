/**
 * Serverless Checkout Session Endpoint
 * Creates a Stripe Checkout Session for subscription purchase
 */

const Stripe = require('stripe');
const { PRICE_IDS } = require('../../server/lib/stripePlans');

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

    // Build success and cancel URLs
    const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 
                   (req.headers['x-forwarded-proto'] && req.headers['host'] 
                     ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
                     : 'https://alphahandle.com');
    
    const successUrl = redirectContext 
      ? `${baseUrl}/pay/success?redirectTo=${encodeURIComponent(redirectContext.redirectTo)}&handle=${encodeURIComponent(redirectContext.handle || '')}`
      : `${baseUrl}/pay/success`;
    
    const cancelUrl = redirectContext
      ? `${baseUrl}/pay/cancel?redirectTo=${encodeURIComponent(redirectContext.redirectTo)}&handle=${encodeURIComponent(redirectContext.handle || '')}`
      : `${baseUrl}/pay/cancel`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        plan,
        cycle,
        ...(redirectContext && { redirectTo: redirectContext.redirectTo, handle: redirectContext.handle || '' }),
      },
    });

    console.log(`[Checkout] Created session ${session.id} for plan ${plan}/${cycle}`);
    return res.status(200).json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
};
