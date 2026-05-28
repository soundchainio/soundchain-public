/**
 * nativeBridge — the seam between Lucy-the-web-app and Lucy-the-droid.
 *
 * The SAME bundle served from lucy.soundchain.io runs in two contexts:
 *   1. A normal browser tab        → Capacitor.isNativePlatform() === false
 *   2. The native Capacitor shell  → isNativePlatform() === true, plugins live
 *
 * Everything here is runtime-gated on isNativePlatform() so the browser path
 * is untouched (LucyLiveMode's getUserMedia still drives the camera on web),
 * and native superpowers (push, native camera, haptics, status bar) only
 * engage inside the shell. Plugin packages are dynamically imported so the
 * web bundle doesn't eagerly pull native-only code into the critical path.
 */

import { Capacitor } from '@capacitor/core'

export const isNative = (): boolean => Capacitor.isNativePlatform()
export const nativePlatform = (): 'ios' | 'android' | 'web' =>
  Capacitor.getPlatform() as 'ios' | 'android' | 'web'

/**
 * Called once on app mount. No-op in the browser. In the shell it:
 *   - locks the status bar to Lucy's dark theme
 *   - hides the splash once React is interactive
 *   - registers for push (so Lucy can reach out), wiring token + tap handlers
 *   - handles hardware back / deep-link app URLs
 */
export async function initNativeShell(): Promise<void> {
  if (!isNative()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {/* status bar unavailable — non-fatal */}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {/* splash already hidden */}

  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else App.exitApp()
    })
  } catch {/* app lifecycle plugin missing */}

  // Push registration — gated to native only (no web implementation exists).
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive === 'granted') {
      await PushNotifications.register()
      PushNotifications.addListener('registration', (token) => {
        // Hand the device token to Lucy's backend so she can push later.
        // norman/Vercel side stores it; left as a fire-and-forget for v1.
        fetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'register_push_token', token: token.value, platform: nativePlatform() }),
        }).catch(() => {/* offline — Lucy retries on next launch */})
      })
    }
  } catch {/* push plugin missing or denied — Lucy stays pull-only */}
}

export interface CapturedImage {
  /** data URL (data:image/jpeg;base64,...) ready to send to Lucy's vision endpoint */
  dataUrl: string
  format: string
}

/**
 * Lucy's eyes. In the native shell this opens the real camera via the
 * Capacitor Camera plugin (better permissions UX + photo quality than a
 * webview getUserMedia frame). In the browser it returns null so callers
 * fall back to their existing getUserMedia path (LucyLiveMode).
 */
export async function captureEyes(): Promise<CapturedImage | null> {
  if (!isNative()) return null
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
    })
    if (!photo.dataUrl) return null
    return { dataUrl: photo.dataUrl, format: photo.format || 'jpeg' }
  } catch {
    return null
  }
}

/** Body feedback — a tap when Lucy acts. No-op on web. */
export async function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }
    await Haptics.impact({ style: map[style] })
  } catch {/* haptics unavailable */}
}
