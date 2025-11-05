import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'fav_handles_v1';

function keyForUser(userId) {
  return `${KEY_PREFIX}:${userId || 'anon'}`;
}

export async function listFavorites(userId) {
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (_) {
    return [];
  }
}

export async function addFavorite(userId, fav) {
  const list = await listFavorites(userId);
  const exists = list.find((x) => x.handle.toLowerCase() === fav.handle.toLowerCase());
  const updated = exists
    ? list.map((x) => (x.handle.toLowerCase() === fav.handle.toLowerCase() ? { ...x, ...fav } : x))
    : [...list, fav];
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(updated));
  return updated;
}

export async function removeFavorite(userId, handle) {
  const list = await listFavorites(userId);
  const updated = list.filter((x) => x.handle.toLowerCase() !== handle.replace(/^@/, '').toLowerCase() && x.handle.toLowerCase() !== handle.toLowerCase());
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(updated));
  return updated;
}

export async function isFavorite(userId, handle) {
  const list = await listFavorites(userId);
  const h = handle.replace(/^@/, '').toLowerCase();
  return list.some((x) => x.handle.toLowerCase() === h || x.handle.toLowerCase() === handle.toLowerCase());
}

