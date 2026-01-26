/**
 * Utility to store and retrieve handle for post-authentication redirect
 * Needed because OAuth redirects lose navigation state
 */

const HANDLE_STORAGE_KEY = 'auth_pending_handle';
const HANDLE_RETRIEVED_KEY = 'auth_handle_retrieved';

/**
 * Store handle before starting authentication flow
 * @param {string} handle - Twitter handle to analyze after auth
 */
export function storeHandleForAuth(handle) {
  if (typeof window !== 'undefined' && handle) {
    sessionStorage.setItem(HANDLE_STORAGE_KEY, handle);
    sessionStorage.removeItem(HANDLE_RETRIEVED_KEY); // Clear retrieval flag when storing new handle
    console.log('[AuthRedirectHandle] ✅ Stored handle for post-auth:', handle);
    console.log('[AuthRedirectHandle] SessionStorage now contains:', sessionStorage.getItem(HANDLE_STORAGE_KEY));
  } else {
    console.log('[AuthRedirectHandle] ⚠️ Cannot store handle:', { window: typeof window, handle });
  }
}

/**
 * Retrieve and clear stored handle after authentication
 * Only retrieves once per authentication session to prevent duplicate loads
 * @returns {string|null} - The stored handle, or null if none
 */
export function getAndClearStoredHandle() {
  if (typeof window !== 'undefined') {
    // Check if we've already retrieved the handle
    const alreadyRetrieved = sessionStorage.getItem(HANDLE_RETRIEVED_KEY);
    if (alreadyRetrieved) {
      console.log('[AuthRedirectHandle] Handle already retrieved in this session, skipping');
      return null;
    }

    const handle = sessionStorage.getItem(HANDLE_STORAGE_KEY);
    console.log('[AuthRedirectHandle] Attempting to retrieve handle from sessionStorage:', handle);
    if (handle) {
      // Mark as retrieved but don't remove the handle yet (in case component remounts)
      sessionStorage.setItem(HANDLE_RETRIEVED_KEY, 'true');
      console.log('[AuthRedirectHandle] ✅ Retrieved handle (marked as retrieved):', handle);
      return handle;
    } else {
      console.log('[AuthRedirectHandle] ⚠️ No handle found in sessionStorage');
    }
  } else {
    console.log('[AuthRedirectHandle] ⚠️ Window is undefined');
  }
  return null;
}

/**
 * Clear the stored handle after successful navigation
 */
export function clearStoredHandle() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(HANDLE_STORAGE_KEY);
    sessionStorage.removeItem(HANDLE_RETRIEVED_KEY);
    console.log('[AuthRedirectHandle] Cleared stored handle');
  }
}

/**
 * Check if there's a pending handle without clearing it
 * @returns {string|null} - The stored handle, or null if none
 */
export function peekStoredHandle() {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(HANDLE_STORAGE_KEY);
  }
  return null;
}
