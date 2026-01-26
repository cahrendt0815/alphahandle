/**
 * Profile Service
 * Manages user profile data in Supabase
 */

import { supabase } from '../utils/supabaseClient';

/**
 * Update last searched handle for a user
 * @param {string} userId - User ID
 * @param {string} handle - Handle that was searched
 * @returns {Promise<void>}
 */
export async function updateLastHandle(userId, handle) {
  if (!userId || !handle) return;

  try {
    console.log('[Profile] Updating last_handle for user:', userId, 'handle:', handle);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        last_handle: handle,
      }, { onConflict: 'id' });

    if (error) {
      console.error('[Profile] Error updating last_handle:', error);
    }
  } catch (err) {
    console.error('[Profile] Unexpected error:', err);
  }
}

/**
 * Get last searched handle for a user
 * @param {string} userId - User ID
 * @returns {Promise<string|null>}
 */
export async function getLastHandle(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_handle')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Profile] Error fetching last_handle:', error);
      return null;
    }

    return data?.last_handle || null;
  } catch (err) {
    console.error('[Profile] Unexpected error:', err);
    return null;
  }
}
