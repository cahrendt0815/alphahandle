/**
 * Stripe Customer Portal API
 * Creates a Stripe Customer Portal session for subscription management
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:8083';

    if (!stripeSecretKey) {
      console.error('[Stripe Portal] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Stripe Portal] Supabase not configured');
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Get auth token from request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No auth token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('[Stripe Portal] Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[Stripe Portal] Creating portal session for user:', user.id);

    // Look up stripe_customer_id from subscriptions
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[Stripe Portal] Error fetching subscription:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    if (!subscription || !subscription.stripe_customer_id) {
      console.log('[Stripe Portal] No active subscription found for user:', user.id);
      return res.status(400).json({
        error: 'No active subscription found. Please subscribe to a plan first.'
      });
    }

    const stripeCustomerId = subscription.stripe_customer_id;
    console.log('[Stripe Portal] Found customer ID:', stripeCustomerId);

    // Create Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/account`,
    });

    console.log('[Stripe Portal] Portal session created:', portalSession.id);

    return res.status(200).json({ url: portalSession.url });

  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error);
    return res.status(500).json({
      error: 'Failed to create portal session',
      details: error.message,
    });
  }
};
