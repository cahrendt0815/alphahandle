/**
 * Checkout Service
 * Client-side wrapper for Stripe Checkout Session creation
 */

/**
 * Create a Stripe Checkout Session
 * @param {string} plan - Plan ID ('ape', 'degen', 'gigachad')
 * @param {string} cycle - Billing cycle ('monthly' or 'yearly')
 * @param {string} email - Optional customer email
 * @param {object} redirectContext - Optional redirect context {redirectTo, handle}
 * @returns {Promise<{url?: string, error?: string}>}
 */
export async function createCheckoutSession(plan, cycle, email = null, redirectContext = null) {
  try {
    console.log('[Checkout] Creating session for:', { plan, cycle, email, redirectContext });

    // Get API base URL from environment
    const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';
    const endpoint = `${apiBase}/api/checkout/create`;

    // Prepare request body
    const body = {
      plan,
      cycle,
    };

    if (email) {
      body.email = email;
    }

    if (redirectContext) {
      body.redirectContext = redirectContext;
    }

    // Call serverless endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Checkout] Error response:', data);
      return {
        error: data.error || 'Failed to create checkout session',
      };
    }

    console.log('[Checkout] Session created successfully');
    return { url: data.url };

  } catch (error) {
    console.error('[Checkout] Network error:', error);
    return {
      error: 'Network error. Please check your connection and try again.',
    };
  }
}
