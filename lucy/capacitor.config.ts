import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Lucy native shell — the "droid in your palm".
 *
 * Remote-load posture (matches web/arena/mint): the native app is a thin
 * WKWebView pointed at the live lucy.soundchain.io. Content updates ship
 * instantly without an App Store review cycle; the native layer only adds
 * the device superpowers Lucy needs to be an agent — camera (eyes), push
 * (reach out), haptics (body feedback), status/splash/keyboard UX.
 *
 * webDir = 'native-shell' (NOT 'out'): Lucy has load-bearing API routes
 * (/api/chat → norman, /api/tools) that can't be statically exported, and
 * since we remote-load anyway, the bundled webDir is only an offline splash
 * fallback. `npx cap sync` copies native-shell/ as that fallback.
 *
 * iOS Info.plist usage strings (added in the generated Xcode project after
 * `npx cap add ios` — see lucy/README native section):
 *   NSCameraUsageDescription       — "Lucy uses the camera to see and reason about what you show her."
 *   NSMicrophoneUsageDescription   — "Lucy listens so you can talk to her hands-free."
 *   NSPhotoLibraryAddUsageDescription — "Save images Lucy generates or captures."
 */
const config: CapacitorConfig = {
  appId: 'io.soundchain.lucy',
  appName: 'Lucy',
  webDir: 'native-shell',

  server: {
    url: 'https://lucy.soundchain.io',
    cleartext: false,
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#05070d',
    scrollEnabled: true,
    appendUserAgent: 'Lucy-iOS/1.0',
    preferredContentMode: 'mobile',
    scheme: 'lucy',
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    backgroundColor: '#05070d',
    allowMixedContent: false,
    appendUserAgent: 'Lucy-Android/1.0',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 400,
      backgroundColor: '#05070d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#05070d',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    App: {},
  },
}

export default config
