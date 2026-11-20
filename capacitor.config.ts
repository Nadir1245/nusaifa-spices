import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nusaifaspices.app',
  appName: 'NUSAIFA SPICES',
  webDir: 'dist',
  server: { url: 'https://nusaifa-spices.onrender.com', cleartext: false }
};

export default config;
