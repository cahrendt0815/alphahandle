/**
 * Auth Redirect Helper
 * Manages redirect intent after authentication
 */

const AUTH_REDIRECT_KEY = 'auth_redirect_intent';

/**
 * Set the redirect intent for after authentication
 * @param {string} route - Route name to redirect to (e.g., 'Plans')
 * @param {object} params - Optional route params
 */
export function setAuthRedirectIntent(route, params = null) {
  if (typeof window === 'undefined') return;

  const intent = { route, params, timestamp: Date.now() };

  try {
    localStorage.setItem(AUTH_REDIRECT_KEY, JSON.stringify(intent));
    console.log('[AuthRedirect] Set redirect intent:', intent);
  } catch (error) {
    console.error('[AuthRedirect] Failed to set redirect intent:', error);
  }
}

/**
 * Get and clear the redirect intent
 * @returns {{route: string, params: object} | null}
 */
export function getAndClearAuthRedirectIntent() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(AUTH_REDIRECT_KEY);

    if (!stored) return null;

    const intent = JSON.parse(stored);

    // Clear the intent
    localStorage.removeItem(AUTH_REDIRECT_KEY);

    // Check if intent is stale (older than 30 minutes)
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - intent.timestamp > thirtyMinutes) {
      console.log('[AuthRedirect] Intent expired, ignoring');
      return null;
    }

    console.log('[AuthRedirect] Retrieved redirect intent:', intent);
    return intent;
  } catch (error) {
    console.error('[AuthRedirect] Failed to get redirect intent:', error);
    return null;
  }
}

/**
 * Get the redirect URL for Supabase auth (for web)
 * @param {string} path - Path to redirect to (e.g., '/plans')
 * @returns {string} - Full redirect URL
 */
export function getAuthRedirectUrl(path = '/plans') {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Check for explicit environment variable override first
  if (process.env.EXPO_PUBLIC_APP_URL) {
    const baseUrl = process.env.EXPO_PUBLIC_APP_URL.replace(/\/$/, ''); // Remove trailing slash
    return `${baseUrl}${path}`;
  }

  const { protocol, host, hostname } = window.location;
  
  // Check if we're in development (localhost or 127.0.0.1)
  const isDevelopment = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.includes('.local');
  
  // Use localhost:8083 for development, otherwise use current host
  if (isDevelopment) {
    // Extract port from current URL, or default to 8083
    const port = host.includes(':') ? host.split(':')[1] : '8083';
    return `http://localhost:${port}${path}`;
  }
  
  // Production: use current host
  return `${protocol}//${host}${path}`;
}
