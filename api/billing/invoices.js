/**
 * Stripe Invoices API
 * Lists customer invoices for billing history
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!stripeSecretKey) {
      console.error('[Stripe Invoices] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Stripe Invoices] Supabase not configured');
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
      console.error('[Stripe Invoices] Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('[Stripe Invoices] Fetching invoices for user:', user.id);

    // Look up stripe_customer_id from subscriptions
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[Stripe Invoices] Error fetching subscription:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    if (!subscription || !subscription.stripe_customer_id) {
      console.log('[Stripe Invoices] No customer ID found for user:', user.id);
      // Return empty array instead of error - user may not have subscribed yet
      return res.status(200).json({ invoices: [] });
    }

    const stripeCustomerId = subscription.stripe_customer_id;
    console.log('[Stripe Invoices] Found customer ID:', stripeCustomerId);

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 24, // last ~2 years of monthly invoices
    });

    console.log('[Stripe Invoices] Found', invoices.data.length, 'invoices');

    // Map to compact JSON format
    const invoiceData = invoices.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      hosted_invoice_url: inv.hosted_invoice_url,
      created: inv.created,
      period_start: inv.period_start,
      period_end: inv.period_end,
      subscription: inv.subscription,
      paid: inv.paid,
    }));

    return res.status(200).json({ invoices: invoiceData });

  } catch (error) {
    console.error('[Stripe Invoices] Error fetching invoices:', error);
    return res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error.message,
    });
  }
};
