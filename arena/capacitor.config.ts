import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.soundchain.arena',
  appName: 'SoundChain Arena',
  webDir: 'out',

  // Remote-load from production: instant content updates without app store review
  server: {
    url: 'https://arena.soundchain.io',
    cleartext: false,
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: true,
    backgroundColor: '#0a0a0f',
    scrollEnabled: true,
    appendUserAgent: 'SoundChainArena-iOS/1.0',
    preferredContentMode: 'mobile',
    scheme: 'soundchainarena',
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
    appendUserAgent: 'SoundChainArena-Android/1.0',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0a0a0f',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
}

export default config
