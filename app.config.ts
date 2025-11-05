import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

// Inject MARKET_BASE_URL into Expo extra
const config: ExpoConfig = {
  name: "alphahandle",
  slug: "alphahandle",
  extra: {
    MARKET_BASE_URL: process.env.MARKET_BASE_URL || "https://alphahandle-api2.onrender.com"
  },
  web: {
    bundler: "metro",
    output: "static"
  }
};

export default config;
