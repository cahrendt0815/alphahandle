/**
 * Stripe Webhook Endpoint
 * Handles Stripe events and updates subscriptions/entitlements in Supabase
 */

const Stripe = require('stripe');
const { buffer } = require('micro');
const { createClient } = require('@supabase/supabase-js');
const { resolvePlanCycleFromPriceId, getPlanConfig } = require('../../lib/stripePlans');

// Disable body parsing, need raw body for signature verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !webhookSecret) {
      console.error('[Webhook] Missing Stripe configuration');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Webhook] Missing Supabase configuration');
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Initialize Stripe and Supabase
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    // In Express with express.raw(), the body is already a Buffer
    const rawBody = req.body;
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('[Webhook] Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing signature header' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    console.log('[Webhook] Event received:', event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, stripe, supabase);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, stripe, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, stripe, supabase);
        break;

      default:
        console.log('[Webhook] Unhandled event type:', event.type);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
};

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session, stripe, supabase) {
  console.log('[Webhook] Processing checkout.session.completed:', session.id);

  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const customerEmail = session.customer_details?.email;

  if (!subscriptionId) {
    console.log('[Webhook] No subscription ID in session');
    return;
  }

  // Fetch the full subscription object
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error('[Webhook] No price ID in subscription');
    return;
  }

  // Resolve plan and cycle from price ID
  const planInfo = resolvePlanCycleFromPriceId(priceId);
  if (!planInfo) {
    console.error('[Webhook] Could not resolve plan from price ID:', priceId);
    return;
  }

  const { plan, cycle } = planInfo;
  console.log('[Webhook] Resolved plan:', plan, 'cycle:', cycle);

  // Find user by email
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('[Webhook] Error fetching users:', userError);
    return;
  }

  const user = userData.users.find(u => u.email === customerEmail);
  if (!user) {
    console.error('[Webhook] User not found for email:', customerEmail);
    return;
  }

  const userId = user.id;
  console.log('[Webhook] Found user:', userId);

  // Upsert subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      cycle,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }, { onConflict: 'stripe_subscription_id' });

  if (subError) {
    console.error('[Webhook] Error upserting subscription:', subError);
    return;
  }

  // Get plan config
  const planConfig = getPlanConfig(plan);
  if (!planConfig) {
    console.error('[Webhook] Invalid plan config:', plan);
    return;
  }

  // Upsert entitlements
  const { error: entError } = await supabase
    .from('entitlements')
    .upsert({
      user_id: userId,
      plan,
      searches_quota: planConfig.searches_quota,
      timeline_months: planConfig.timeline_months,
      refresh_at: new Date(subscription.current_period_end * 1000).toISOString(),
    }, { onConflict: 'user_id' });

  if (entError) {
    console.error('[Webhook] Error upserting entitlements:', entError);
    return;
  }

  console.log('[Webhook] Successfully provisioned subscription for user:', userId);
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription, stripe, supabase) {
  console.log('[Webhook] Processing subscription update:', subscription.id);

  const customerId = subscription.customer;
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error('[Webhook] No price ID in subscription');
    return;
  }

  // Resolve plan and cycle
  const planInfo = resolvePlanCycleFromPriceId(priceId);
  if (!planInfo) {
    console.error('[Webhook] Could not resolve plan from price ID:', priceId);
    return;
  }

  const { plan, cycle } = planInfo;

  // Find subscription in database
  const { data: subData, error: subFetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (subFetchError) {
    console.error('[Webhook] Error fetching subscription:', subFetchError);
    return;
  }

  if (!subData) {
    console.log('[Webhook] Subscription not found in database, skipping update');
    return;
  }

  const userId = subData.user_id;

  // Validate current_period_end
  if (!subscription.current_period_end || isNaN(subscription.current_period_end)) {
    console.error('[Webhook] Invalid current_period_end:', subscription.current_period_end);
    return;
  }

  // Update subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      plan,
      cycle,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subError) {
    console.error('[Webhook] Error updating subscription:', subError);
    return;
  }

  // Update entitlements
  const planConfig = getPlanConfig(plan);
  if (planConfig) {
    const { error: entError } = await supabase
      .from('entitlements')
      .update({
        plan,
        searches_quota: planConfig.searches_quota,
        timeline_months: planConfig.timeline_months,
        refresh_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('user_id', userId);

    if (entError) {
      console.error('[Webhook] Error updating entitlements:', entError);
    }
  }

  console.log('[Webhook] Successfully updated subscription:', subscription.id);
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription, supabase) {
  console.log('[Webhook] Processing subscription deletion:', subscription.id);

  // Find subscription in database
  const { data: subData, error: subFetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (subFetchError || !subData) {
    console.error('[Webhook] Subscription not found');
    return;
  }

  const userId = subData.user_id;

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);

  // Reset entitlements to free tier
  const { error: entError } = await supabase
    .from('entitlements')
    .upsert({
      user_id: userId,
      plan: null,
      searches_quota: 0,
      timeline_months: 6,
      refresh_at: null,
    }, { onConflict: 'user_id' });

  if (entError) {
    console.error('[Webhook] Error resetting entitlements:', entError);
  }

  console.log('[Webhook] Successfully canceled subscription for user:', userId);
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice, stripe, supabase) {
  console.log('[Webhook] Processing payment success:', invoice.id);

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    return;
  }

  // Fetch subscription and update period
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (!subData) {
    return;
  }

  // Update current_period_end
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  await supabase
    .from('entitlements')
    .update({
      refresh_at: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', subData.user_id);

  console.log('[Webhook] Updated subscription period');
}
