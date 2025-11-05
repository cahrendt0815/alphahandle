/**
 * Profile Image Cache Service
 * Caches Twitter profile images for 3 months
 */

import { Platform } from 'react-native';
import { MARKET_BASE_URL } from '../lib/appEnv';

const CACHE_PREFIX = 'profile_cache_v2_';
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000; // 3 months in milliseconds

/**
 * Get cached profile data
 */
export async function getCachedProfile(handle) {
  try {
    const key = `${CACHE_PREFIX}${handle.toLowerCase()}`;
    let cached;

    if (Platform.OS === 'web') {
      // Use localStorage for web
      cached = localStorage.getItem(key);
    } else {
      // For mobile, would use AsyncStorage
      return null;
    }

    if (!cached) {
      return null;
    }

    const data = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (less than 3 months old)
    if (now - data.timestamp < CACHE_DURATION) {
      // If cached profile lacks extended fields, treat as stale and refetch
      const p = data.profile || {};
      const hasExtended = typeof p.description === 'string' && typeof p.followers_count !== 'undefined' && typeof p.friends_count !== 'undefined';
      if (hasExtended) return p;
    }

    // Cache expired
    return null;
  } catch (error) {
    console.warn('Error reading profile cache:', error);
    return null;
  }
}

/**
 * Save profile data to cache
 */
export async function cacheProfile(handle, profileData) {
  try {
    const key = `${CACHE_PREFIX}${handle.toLowerCase()}`;
    const cacheData = {
      profile: profileData,
      timestamp: Date.now()
    };

    if (Platform.OS === 'web') {
      // Use localStorage for web
      localStorage.setItem(key, JSON.stringify(cacheData));
    } else {
      // For mobile, would use AsyncStorage
    }
  } catch (error) {
    console.warn('Error saving profile cache:', error);
  }
}

/**
 * Fetch profile image from Twitter API
 */
export async function fetchProfileImage(handle) {
  console.log('[ProfileCache] Fetching profile for:', handle);

  // Check cache first
  const cached = await getCachedProfile(handle);
  if (cached) {
    console.log('[ProfileCache] Using cached profile:', cached);
    // Skip cache if it's a fallback profile (has error field)
    if (!cached.error) {
      return cached;
    }
    console.log('[ProfileCache] Cached profile is fallback, fetching fresh data');
  }

  // Fetch from backend API (FastAPI server on port 8000)
  const cleanHandle = handle.replace('@', '');
  console.log(`[ProfileCache] Fetching from ${MARKET_BASE_URL}/api/profile/${cleanHandle}`);

  try {
    const response = await fetch(`${MARKET_BASE_URL}/api/profile/${cleanHandle}`);

    console.log('[ProfileCache] Backend Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[ProfileCache] Backend error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[ProfileCache] Backend Response data:', data);

    // Backend now returns extended fields
    const profileData = {
      imageUrl: data.imageUrl,
      name: data.name,
      username: data.username,
      verified: data.verified || false,
      description: data.description || '',
      created_at: data.created_at || '',
      followers_count: data.followers_count || 0,
      friends_count: data.friends_count || 0,
      profile_url: data.profile_url || `https://x.com/${cleanHandle}/photo`
    };

    // Cache for 3 months
    await cacheProfile(handle, profileData);

    return profileData;
  } catch (error) {
    console.warn(`Failed to fetch profile for ${handle}:`, error.message);

    // Return a fallback profile with placeholder image
    // This happens due to CORS restrictions when calling Twitter API from browser
    const fallbackProfile = {
      imageUrl: `https://ui-avatars.com/api/?name=${cleanHandle}&size=128&background=635BFF&color=fff&bold=true`,
      name: cleanHandle,
      username: cleanHandle,
      verified: false,
      description: '',
      created_at: '',
      followers_count: 0,
      friends_count: 0,
      profile_url: `https://x.com/${cleanHandle}/photo`
    };

    // Cache the fallback for 24 hours (not 3 months)
    await cacheProfile(handle, fallbackProfile);

    return fallbackProfile;
  }
}
