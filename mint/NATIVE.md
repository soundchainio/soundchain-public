# Mint native builds (Capacitor)

Phase 7 of the SoundChain split. Mint ships as iOS + Android native apps via
Capacitor 6 (same stack as arena). The web app at `mint.soundchain.io` is
the source of truth; native shells thin-wrap it via WebView.

## Prerequisites (Frank's machine)

- Xcode 15+ (for iOS) — Mac App Store
- Android Studio + Android SDK 33+ (for Android) — developer.android.com
- Cocoapods (iOS) — `sudo gem install cocoapods`
- JDK 17+ (Android) — `brew install --cask zulu17`

## First-time scaffolding (run once)

```bash
cd /Users/soundchain/soundchain/mint
yarn install                # installs Capacitor plugins
yarn build                  # generates Next.js .next/
yarn cap:add:ios            # creates ios/App/ scaffold
yarn cap:add:android        # creates android/app/ scaffold
yarn cap:sync               # copies web build into native projects
```

Capacitor reads `capacitor.config.ts` for app metadata:
- `appId`: `io.soundchain.mint` (matches Apple/Google bundle IDs)
- `appName`: `SoundChain Mint`
- `server.url`: `https://mint.soundchain.io` (live web app)

## Apple Developer setup (Frank's tasks)

1. App Store Connect → create new app `io.soundchain.mint` "SoundChain Mint"
2. Provision distribution certificate + provisioning profile
3. Open `ios/App/App.xcworkspace` in Xcode
4. Signing & Capabilities → Team = SoundChain LLC, bundle ID = `io.soundchain.mint`
5. Archive → Upload to App Store Connect
6. TestFlight → distribute to internal testers
7. Submit for review

**App Store NFT compliance (3.1.5a):**
- No fiat pricing displayed for NFT purchases in-app
- No in-app crypto purchases (purchases happen on Polygon directly via wallet)
- Mint flow shows "approve and sign" — user pays gas + price on-chain, Apple takes no cut
- Should pass review since mint is a viewer/manager for on-chain assets, not a payment surface

## Google Play setup (Frank's tasks)

1. Google Play Console → create app `io.soundchain.mint`
2. Generate upload keystore: `keytool -genkey -v -keystore mint-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
3. Save keystore + password securely (lose this = can't update the app)
4. Open `android/` in Android Studio
5. Build → Generate Signed Bundle (.aab)
6. Upload .aab to Play Console internal track
7. Submit for review

**Google Play crypto compliance:**
- DSPP (Distribution Software Provider Program) — register if accepting payments
- NFT viewer/manager apps are permitted; on-chain transactions outside the app
- Mint app behaves the same as MetaMask Mobile — user signs txs in their wallet

## Sync flow (every web update)

After deploying mint.soundchain.io updates to Vercel:

```bash
cd mint
yarn build
yarn cap:sync          # picks up new web build
# Open Xcode and Android Studio, hit Run to test, then re-archive for submission
```

For most updates, the WebView pulls the latest from `mint.soundchain.io`
automatically — no native re-submission needed. Only ship a new native
build when:
- Capacitor plugin version changes
- Native code (Swift/Kotlin) added or modified
- App icon, splash screen, or metadata changes
- Major version bump on Capacitor itself

## Troubleshooting

| Symptom | Fix |
|---|---|
| `yarn cap:add:ios` fails with "Pod install failed" | `cd ios/App && pod install` then retry |
| Android build "Failed to find Build Tools" | Open Android Studio → SDK Manager → install latest |
| WebView blank screen on iOS simulator | Check `server.url` in capacitor.config.ts; should be `https://mint.soundchain.io` |
| App can't access wallet on iOS | iOS WebKit blocks `window.ethereum` injection in some contexts; use deep-link to wallet app (MetaMask, Rainbow, Trust) |

## Native wallet bridge (Phase 7.5 — when iOS doesn't inject ethereum)

iOS WebKit historically doesn't expose `window.ethereum` even inside Capacitor.
The workaround used across all crypto Capacitor apps: deep-link to a wallet
app via universal link, sign tx there, return result via custom URL scheme.

Same pattern arena uses for its passkey/Apple/Google flows — mint can adopt
the equivalent for wallet transactions. Plugin path: `@capacitor/app` +
custom Swift bridge or off-the-shelf `@capacitor-community/walletconnect`.

Defer until first beta tester reports it. Most modern wallet apps
(MetaMask Mobile, Rainbow) handle this via WalletConnect QR auto-deep-link.
