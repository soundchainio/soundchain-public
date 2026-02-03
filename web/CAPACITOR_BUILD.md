# SoundChain Capacitor Build Guide

## Overview

SoundChain uses Capacitor 8.0 to wrap the Next.js web app as native iOS and Android apps. The app loads from the live URL (`https://soundchain.io`) rather than bundling static assets, ensuring users always get the latest web updates without app store releases.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPACITOR WRAPPER ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────┐         ┌─────────────────────┐
  │     iOS App         │         │    Android App      │
  │   (Xcode Project)   │         │  (Android Studio)   │
  │                     │         │                     │
  │  ┌───────────────┐  │         │  ┌───────────────┐  │
  │  │   WKWebView   │  │         │  │   WebView     │  │
  │  │               │  │         │  │               │  │
  │  │ soundchain.io │  │         │  │ soundchain.io │  │
  │  │               │  │         │  │               │  │
  │  └───────┬───────┘  │         │  └───────┬───────┘  │
  │          │          │         │          │          │
  │  ┌───────┴───────┐  │         │  ┌───────┴───────┐  │
  │  │   Capacitor   │  │         │  │   Capacitor   │  │
  │  │   Bridge      │  │         │  │   Bridge      │  │
  │  │               │  │         │  │               │  │
  │  │ Native Plugins│  │         │  │ Native Plugins│  │
  │  └───────────────┘  │         │  └───────────────┘  │
  └─────────────────────┘         └─────────────────────┘
```

## Installed Plugins

| Plugin | Purpose |
|--------|---------|
| `@capacitor/app` | App lifecycle, deep links, URL handling |
| `@capacitor/browser` | In-app browser for OAuth, external links |
| `@capacitor/device` | Device info, platform detection |
| `@capacitor/haptics` | Haptic feedback for interactions |
| `@capacitor/keyboard` | Keyboard events, resize behavior |
| `@capacitor/network` | Network status, offline detection |
| `@capacitor/push-notifications` | Push notification registration |
| `@capacitor/share` | Native share sheet integration |
| `@capacitor/splash-screen` | Launch screen management |
| `@capacitor/status-bar` | Status bar styling |

## Build Commands

```bash
# Sync plugins to native projects (run after plugin changes)
yarn cap:sync

# Open iOS project in Xcode
yarn cap:ios

# Open Android project in Android Studio
yarn cap:android

# Build + export + sync for iOS
yarn cap:ios:build

# Build + export + sync for Android
yarn cap:android:build

# Copy web assets only (no plugin update)
yarn cap:copy

# Update Capacitor packages
yarn cap:update
```

## iOS Build Steps

### Prerequisites
- macOS with Xcode 15+
- Apple Developer Account ($99/year)
- iOS Deployment Target: 14.0+

### Build for TestFlight / App Store

1. **Open Xcode Project**
   ```bash
   yarn cap:ios
   ```

2. **Configure Signing**
   - Select "App" target
   - Signing & Capabilities tab
   - Team: Select your Apple Developer Team
   - Bundle ID: `io.soundchain.app`

3. **Add Push Notification Capability**
   - Click "+ Capability"
   - Add "Push Notifications"
   - Add "Background Modes" → Check "Remote notifications"

4. **Archive for Distribution**
   - Product → Destination → Any iOS Device
   - Product → Archive
   - Distribute App → App Store Connect

### Key iOS Files
- `ios/App/App/Info.plist` - App permissions, URL schemes
- `ios/App/App/AppDelegate.swift` - App lifecycle, push handling
- `ios/App/App/Assets.xcassets` - App icons, launch images

## Android Build Steps

### Prerequisites
- Android Studio Hedgehog+
- Google Play Developer Account ($25 one-time)
- Min SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)

### Build for Play Store

1. **Open Android Studio Project**
   ```bash
   yarn cap:android
   ```

2. **Configure Signing**
   - Build → Generate Signed Bundle/APK
   - Create new keystore or use existing
   - Store securely - you need it for ALL future updates!

3. **Build Release AAB**
   - Build → Generate Signed Bundle/APK
   - Select "Android App Bundle"
   - Choose release build variant

4. **Upload to Play Console**
   - Create app in Google Play Console
   - Upload AAB to Internal/Production track
   - Fill store listing, content rating, pricing

### Key Android Files
- `android/app/src/main/AndroidManifest.xml` - Permissions, activities
- `android/app/src/main/res/` - Icons, splash screens, strings
- `android/app/build.gradle` - Dependencies, versions

## Configuration

### capacitor.config.ts

```typescript
const config: CapacitorConfig = {
  appId: 'io.soundchain.app',
  appName: 'SoundChain',
  webDir: 'out',

  // Load from live URL - always up to date
  server: {
    url: 'https://soundchain.io',
    cleartext: false,
  },

  // Platform-specific settings
  ios: { ... },
  android: { ... },
  plugins: { ... }
}
```

### Why Live URL Loading?

1. **Instant Updates** - Web changes deploy instantly without app store review
2. **Single Codebase** - Same code for web + mobile
3. **No Binary Size** - App stays small (~10MB vs 50MB+ with bundled assets)
4. **PWA Fallback** - Web works even if app stores reject

### Offline Considerations

With live URL loading, the app requires internet. For offline support:
- Service Worker caches critical assets (already configured)
- Network plugin detects offline state
- Show offline message when disconnected

## Push Notifications Setup

### iOS (APNs)

1. Create APNs Key in Apple Developer Portal
2. Upload to your push provider (we use web-push with VAPID)
3. Handle token in AppDelegate.swift

### Android (FCM)

1. Create Firebase project
2. Add `google-services.json` to `android/app/`
3. Configure FCM in AndroidManifest

### Web Push Integration

The app uses the existing web push infrastructure:
- VAPID keys already configured
- Service worker handles push events
- Same subscription flow as PWA

## Deep Linking

### URL Schemes
- `soundchain://` - Custom scheme for app-to-app linking
- `https://soundchain.io/*` - Universal links (iOS) / App Links (Android)

### Supported Deep Links
```
soundchain://track/{id}    → Track detail page
soundchain://profile/{handle} → User profile
soundchain://post/{id}     → Single post view
soundchain://wallet        → Wallet dashboard
```

### Universal Links Setup (iOS)

1. Add Associated Domains capability in Xcode
2. Host `apple-app-site-association` at `soundchain.io/.well-known/`

### App Links Setup (Android)

1. Add intent-filter in AndroidManifest
2. Verify domain ownership in Play Console

## App Store Submission Notes

### Apple App Store

**Crypto/NFT apps face stricter review.** Key requirements:
- No direct crypto purchases within the app (use external browser)
- In-App Purchase for any "digital content"
- Clear disclosure of blockchain functionality
- Comply with guideline 3.1.1 (In-App Purchase)

**Workarounds:**
- NFT minting/trading opens in external browser via `@capacitor/browser`
- OGUN token transactions happen via WalletConnect/MetaMask externally
- Social features (feed, profiles, messaging) work natively

### Google Play Store

More permissive with crypto apps but requires:
- Blockchain transparency disclosure
- Clear explanation of token utility
- Compliance with gambling policies (if applicable)

## Troubleshooting

### Build Fails
```bash
# Clean and retry
npx cap sync --inline
cd ios && pod deintegrate && pod install
cd android && ./gradlew clean
```

### Plugins Not Working
```bash
# Verify plugin installation
npx cap ls

# Force update
npx cap update
```

### WebView Not Loading
- Check internet connection
- Verify `server.url` in capacitor.config.ts
- Check for CSP issues in browser console

## Version Management

App store releases should increment version:
- `ios/App/App/Info.plist` → `CFBundleShortVersionString`
- `android/app/build.gradle` → `versionName` / `versionCode`

Recommended versioning:
- 1.0.0 - Initial release
- 1.0.1 - Bug fixes (no new features)
- 1.1.0 - New features
- 2.0.0 - Major redesign

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
- [SoundChain CLAUDE.md](./CLAUDE.md) - Full development context
