import type { CapacitorConfig } from '@capacitor/cli';

// NOTE: appId is provisional. It becomes permanent once the app is published on Google Play.
const config: CapacitorConfig = {
  appId: 'com.judilsong.towerdefense',
  appName: 'Tower Defense',
  webDir: 'dist',
  android: {
    backgroundColor: '#0e0f12',
  },
  plugins: {
    // Full-screen game: never pad the WebView for system bars or the camera cutout
    // (MainActivity hides the bars and draws under the cutout).
    SystemBars: {
      insetsHandling: 'disable',
      hidden: true,
    },
  },
};

export default config;
