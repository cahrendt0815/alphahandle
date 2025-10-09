/**
 * Entitlements Service
 * Manages user subscriptions and access control
 */

import { supabase } from '../utils/supabaseClient';

/**
 * Get entitlement for a user from Supabase
 * @param {object} user - Supabase user object
 * @returns {Promise<object>} - Entitlement details
 */
export async function getEntitlementForUser(user) {
  // No user = free plan with no searches
  if (!user) {
    console.log('[Entitlements] No user provided, returning free plan');
    return {
      plan: 'free',
      searches_quota: 0,
      searchesPerMonth: 0,
      timeline_months: 6, // Free users see 6 months
      refresh_at: null,
    };
  }

  try {
    console.log('[Entitlements] Fetching entitlements for user:', user.id);
    // Fetch entitlements from Supabase
    const { data, error } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[Entitlements] Query result - data:', data, 'error:', error);

    if (error) {
      console.error('[Entitlements] Error fetching entitlements:', error);
      // Fallback to free tier on error
      return {
        plan: 'free',
        searches_quota: 0,
        searchesPerMonth: 0,
        timeline_months: 6,
        refresh_at: null,
      };
    }

    // If no entitlement record, return free tier
    if (!data) {
      console.log('[Entitlements] No entitlement record found, returning free plan');
      return {
        plan: 'free',
        searches_quota: 0,
        searchesPerMonth: 0,
        timeline_months: 6,
        refresh_at: null,
      };
    }

    // Return entitlement data
    console.log('[Entitlements] Returning entitlement:', {
      plan: data.plan,
      searches_quota: data.searches_quota,
      timeline_months: data.timeline_months,
      refresh_at: data.refresh_at,
    });
    return {
      plan: data.plan,
      searches_quota: data.searches_quota,
      timeline_months: data.timeline_months,
      refresh_at: data.refresh_at,
    };
  } catch (err) {
    console.error('[Entitlements] Unexpected error:', err);
    return {
      plan: 'free',
      searches_quota: 0,
      searchesPerMonth: 0,
      timeline_months: 6,
      refresh_at: null,
    };
  }
}

/**
 * Check if user has access to full history
 * @param {object} entitlement - Entitlement object from getEntitlementForUser
 * @returns {boolean}
 */
export function hasFullAccess(entitlement) {
  return entitlement.plan !== null && entitlement.plan !== 'free';
}

/**
 * Get plan details
 * @param {string} planId - Plan identifier ('ape', 'degen', 'gigachad')
 * @param {string} cycle - Billing cycle ('monthly' or 'yearly')
 * @returns {object} - Plan details
 */
export function getPlanDetails(planId, cycle = 'monthly') {
  const plans = {
    ape: {
      id: 'ape',
      name: 'Ape',
      priceMonthly: 12.90,
      priceYearly: 100.62,
      description: '5 searches/mo • timeline up to 12 months',
      features: [
        '5 searches per month',
        '12-month analysis history',
        'Basic performance metrics',
        'Email support',
      ],
      timelineMonths: 12,
      searchLimit: 5,
    },
    degen: {
      id: 'degen',
      name: 'Degen',
      priceMonthly: 19.90,
      priceYearly: 155.22,
      description: '10 searches/mo • timeline up to 24 months',
      features: [
        '10 searches per month',
        '24-month analysis history',
        'Advanced performance metrics',
        'Priority support',
        'Export to CSV',
      ],
      timelineMonths: 24,
      searchLimit: 10,
      popular: true,
    },
    gigachad: {
      id: 'gigachad',
      name: 'GigaChad',
      priceMonthly: 49.90,
      priceYearly: 389.22,
      description: '50 searches/mo • unlimited timeline',
      features: [
        '50 searches per month',
        'Full historical data (all-time)',
        'Advanced performance metrics',
        'API access',
        'White-label reports',
        'Dedicated support',
      ],
      timelineMonths: Infinity,
      searchLimit: 50,
    },
  };

  const plan = plans[planId];
  if (!plan) return null;

  // Add formatted price based on cycle
  const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const formattedPrice = cycle === 'yearly'
    ? `$${price.toFixed(2)}/year`
    : `$${price.toFixed(2)}/month`;

  return {
    ...plan,
    price: formattedPrice,
    priceValue: price,
    cycle,
  };
}

/**
 * Get all available plans
 * @param {string} cycle - Billing cycle ('monthly' or 'yearly')
 * @returns {array} - Array of plan objects
 */
export function getAllPlans(cycle = 'monthly') {
  return [
    getPlanDetails('ape', cycle),
    getPlanDetails('degen', cycle),
    getPlanDetails('gigachad', cycle),
  ];
}
