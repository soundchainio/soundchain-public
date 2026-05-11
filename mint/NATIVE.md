# Mint native builds (Capacitor)

iOS + Android shells via Capacitor 6, thin-wrapping the live web app.

## Prerequisites

- Xcode 15+ (iOS)
- Android Studio + Android SDK 33+
- Cocoapods (`sudo gem install cocoapods`)
- JDK 17+ (`brew install --cask zulu17`)

## First-time scaffolding

```bash
cd mint
yarn install
yarn build
yarn cap:add:ios
yarn cap:add:android
yarn cap:sync
```

`capacitor.config.ts` defines:
- `appId`: `io.soundchain.mint`
- `appName`: `SoundChain Mint`
- `server.url`: `https://mint.soundchain.io`

## App Store / Play Console submission

Standard flow — App Store Connect for iOS, Google Play Console for Android.

iOS bundle ID + Android applicationId must match `io.soundchain.mint`.
Keystore for Android signing: generated locally, kept off-repo.

## Ongoing sync

After web deploys:
```bash
yarn build
yarn cap:sync
```

WebView pulls latest from `mint.soundchain.io` automatically — most updates
need no native re-submission. Re-archive only for native code, plugin
version, icon, or major Capacitor version changes.

## iOS wallet bridge (if needed)

If `window.ethereum` isn't injected in iOS WebView, deep-link to wallet
apps via WalletConnect QR + universal link. Most modern wallets handle
this; defer to first beta tester report.
