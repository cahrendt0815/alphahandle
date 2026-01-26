import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: "alphahandle",
  slug: "alphahandle",
  extra: {},
  web: {
    bundler: "metro",
    output: "single-page"
  }
};

export default config;
