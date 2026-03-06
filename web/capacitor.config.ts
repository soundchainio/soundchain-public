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
    contentInset: 'always', // Always inset content below status bar
    allowsLinkPreview: true,
    backgroundColor: '#000000',
    scrollEnabled: true,
    appendUserAgent: 'SoundChain-iOS/1.0',
    preferredContentMode: 'mobile',
    scheme: 'soundchain',
    // Ensure WebView respects safe areas
    limitsNavigationsToAppBoundDomains: false,
  },

  // Android specific settings
  android: {
    backgroundColor: '#000000',
    allowMixedContent: false,
    appendUserAgent: 'SoundChain-Android/1.0',
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
  },

  plugins: {
    // Splash screen config
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Status bar config
    StatusBar: {
      style: 'LIGHT', // Light text on dark background
      backgroundColor: '#000000',
    },

    // Push notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Keyboard behavior
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },

    // App URL handling for deep links
    App: {
      // Handle soundchain.io deep links
    },
  },
};

export default config;
