import Constants from 'expo-constants';

// Handles SDK differences (dev/build)
export function getBaseUrl(): string {
  // @ts-ignore – on SDK 50+, use expoConfig; on older, manifest?.extra
  const extra = (Constants?.expoConfig?.extra || Constants?.manifest?.extra) as Record<string, any> | undefined;
  return (extra?.MARKET_BASE_URL as string) || "https://alphahandle-api2.onrender.com";
}
