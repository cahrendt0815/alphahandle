/**
 * Validate Twitter handle format
 * @param {string} handle - Twitter handle (with or without @)
 * @returns {boolean} - True if valid
 */
export function validateHandle(handle) {
  if (!handle || typeof handle !== 'string') {
    return false;
  }
  
  const cleanHandle = handle.replace(/^@/, '').trim();
  
  // Twitter handles: 1-15 characters, alphanumeric + underscore
  if (cleanHandle.length === 0 || cleanHandle.length > 15) {
    return false;
  }
  
  // Only letters, numbers, and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
    return false;
  }
  
  return true;
}
