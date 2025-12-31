import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.soundchain.app',
  appName: 'SoundChain',
  webDir: 'out',
  // Load from live URL - always up to date, no app store updates needed for web changes
  server: {
    url: 'https://soundchain.io',
    cleartext: false, // HTTPS only
  },
  // iOS specific settings
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    backgroundColor: '#000000',
    scrollEnabled: true,
    // Background audio capability
    appendUserAgent: 'SoundChain-iOS',
    preferredContentMode: 'mobile',
  },
  // Android specific settings
  android: {
    backgroundColor: '#000000',
    allowMixedContent: false,
    appendUserAgent: 'SoundChain-Android',
  },
  plugins: {
    // Splash screen config
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
