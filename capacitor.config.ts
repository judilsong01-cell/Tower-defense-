import type { CapacitorConfig } from '@capacitor/cli';

// NOTE: appId is provisional. It becomes permanent once the app is published on Google Play.
const config: CapacitorConfig = {
  appId: 'com.judilsong.towerdefense',
  appName: 'Tower Defense',
  webDir: 'dist',
  android: {
    backgroundColor: '#0e0f12',
  },
};

export default config;
