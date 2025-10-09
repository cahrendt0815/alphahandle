/**
 * Stripe Plans and Price ID Mapping
 * Central source of truth for plan configurations and price IDs
 */

// Stripe Price IDs (UPDATED with real test mode IDs)
const PRICE_IDS = {
  ape: {
    monthly: 'price_1SDhoMJV7fyIECvZjvl37WjZ',
    yearly: 'price_1SDhvjJV7fyIECvZHc3HOq2J',
  },
  degen: {
    monthly: 'price_1SDhztJV7fyIECvZ3xQHwFZS',
    yearly: 'price_1SDi1nJV7fyIECvZPj0apGro',
  },
  gigachad: {
    monthly: 'price_1SDi13JV7fyIECvZtKzggLF2',
    yearly: 'price_1SDi3OJV7fyIECvZkCFjGad5',
  },
};

// Plan configurations
const PLAN_CONFIGS = {
  ape: {
    searches_quota: 5,
    timeline_months: 12,
  },
  degen: {
    searches_quota: 10,
    timeline_months: 24,
  },
  gigachad: {
    searches_quota: 50,
    timeline_months: 9999, // Unlimited (treated as very large number)
  },
};

/**
 * Resolve plan and cycle from a Stripe price ID
 * @param {string} priceId - Stripe price ID
 * @returns {{plan: string, cycle: string} | null}
 */
function resolvePlanCycleFromPriceId(priceId) {
  for (const plan of Object.keys(PRICE_IDS)) {
    for (const cycle of Object.keys(PRICE_IDS[plan])) {
      if (PRICE_IDS[plan][cycle] === priceId) {
        return { plan, cycle };
      }
    }
  }
  return null;
}

/**
 * Get plan configuration (quota, timeline)
 * @param {string} plan - Plan ID ('ape', 'degen', 'gigachad')
 * @returns {{searches_quota: number, timeline_months: number} | null}
 */
function getPlanConfig(plan) {
  return PLAN_CONFIGS[plan] || null;
}

module.exports = {
  PRICE_IDS,
  PLAN_CONFIGS,
  resolvePlanCycleFromPriceId,
  getPlanConfig,
};
