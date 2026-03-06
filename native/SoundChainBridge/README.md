# SoundChain Bridge - iOS Companion App

Native iOS app that bridges the SoundChain web app to Bluetooth mesh networking, enabling communication with Bitchat users.

## Architecture

```
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  SoundChain Web     │     │  SoundChain       │     │   Bitchat Users     │
│  (Browser)          │◄───►│  Bridge App       │◄───►│   (Bluetooth Mesh)  │
│                     │     │  (This App)       │     │                     │
│  ws://localhost:8765│     │  WebSocket Server │     │  Multipeer          │
└─────────────────────┘     │  + Bluetooth Mesh │     │  Connectivity       │
                            └───────────────────┘     └─────────────────────┘
```

## Features

- **WebSocket Server**: Listens on `localhost:8765` for web app connections
- **Bluetooth Mesh**: Uses Multipeer Connectivity for device-to-device communication
- **Bitchat Compatible**: Works with Jack Dorsey's Bitchat mesh networking app
- **Real-time UI**: Shows connected devices, messages, and bridge status

## Setup Instructions

### 1. Create Xcode Project

1. Open Xcode
2. Create new project: **File → New → Project**
3. Select **iOS → App**
4. Configure:
   - Product Name: `SoundChainBridge`
   - Team: Your Apple Developer account
   - Organization Identifier: `io.soundchain`
   - Interface: **SwiftUI**
   - Language: **Swift**
5. Click **Create**

### 2. Add Source Files

Copy these files from this folder into your Xcode project:

```
SoundChainBridge/
├── SoundChainBridgeApp.swift  (replace generated App file)
├── ContentView.swift          (replace generated ContentView)
├── BridgeServer.swift         (add to project)
├── Info.plist                 (merge with generated Info.plist)
└── Assets.xcassets/           (replace generated assets)
```

### 3. Configure Info.plist

Add these required permissions (already in the provided Info.plist):

```xml
<!-- Bluetooth -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>SoundChain Bridge uses Bluetooth to discover nearby Bitchat users.</string>

<!-- Local Network (WebSocket server) -->
<key>NSLocalNetworkUsageDescription</key>
<string>SoundChain Bridge needs local network access to communicate with the web app.</string>

<!-- Bonjour Services -->
<key>NSBonjourServices</key>
<array>
    <string>_soundchain-mesh._tcp</string>
</array>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
    <string>bluetooth-central</string>
    <string>bluetooth-peripheral</string>
</array>
```

### 4. Enable Capabilities

In Xcode, go to your target's **Signing & Capabilities**:

1. Click **+ Capability**
2. Add **Background Modes**
   - Check: "Uses Bluetooth LE accessories"
   - Check: "Acts as a Bluetooth LE accessory"
3. Add **Access WiFi Information** (optional, for network info)

### 5. Build & Run

1. Connect your iPhone via USB
2. Select your device as the run destination
3. Click **Run** (⌘R)
4. Grant Bluetooth and Local Network permissions when prompted

## Usage

### On Your iPhone

1. Launch **SoundChain Bridge**
2. Tap **Start Bridge**
3. Keep the app open (can be in background)

### On Your Computer/Browser

1. Make sure iPhone and computer are on **same WiFi network**
2. Open **soundchain.io/dex/nearby**
3. The web app auto-connects to the bridge
4. Start chatting! Messages bridge to Bluetooth mesh

### With Bitchat

1. Other users nearby with Bitchat will auto-discover via Bluetooth
2. Messages sent from SoundChain web → Bridge → Bluetooth → Bitchat users
3. Messages from Bitchat users → Bluetooth → Bridge → SoundChain web

## Protocol Specification

### WebSocket Messages

All messages are JSON with this structure:

```json
{
  "type": "message_type",
  "payload": { ... },
  "timestamp": 1705123456789,
  "id": "unique-id"
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `handshake` | Web → Bridge | Initial connection |
| `handshake_ack` | Bridge → Web | Connection confirmed |
| `chat_message` | Web → Bridge | Send chat message |
| `chat_received` | Bridge → Web | Received from Bluetooth |
| `mesh_status` | Both | Request/send mesh status |
| `nearby_devices` | Bridge → Web | List of nearby devices |
| `device_joined` | Bridge → Web | New device discovered |
| `device_left` | Bridge → Web | Device disconnected |
| `ping`/`pong` | Both | Keep-alive |

### Handshake Flow

```
Web                          Bridge
 │                              │
 │──── handshake ──────────────►│
 │     {version, geohash,       │
 │      pubkey, client}         │
 │                              │
 │◄─── handshake_ack ───────────│
 │     {version, bluetoothEnabled,
 │      deviceCount}            │
 │                              │
```

### Chat Flow

```
Web                    Bridge               Bitchat
 │                        │                    │
 │── chat_message ───────►│                    │
 │   {content, geohash}   │                    │
 │                        │── Bluetooth ──────►│
 │                        │                    │
 │◄── chat_received ──────│◄── Bluetooth ──────│
 │   {content, pubkey,    │                    │
 │    source: "bluetooth"}│                    │
```

## Troubleshooting

### "Bridge not connecting"

1. Ensure iPhone and computer are on same WiFi
2. Check that iOS Local Network permission was granted
3. Try restarting the bridge app

### "No nearby devices"

1. Ensure Bluetooth is enabled on iPhone
2. Check that Bluetooth permission was granted
3. Other users need Bitchat or another SoundChain Bridge running

### "Messages not sending"

1. Check the bridge status indicator is green
2. Ensure web app shows "Connected to Bridge"
3. Check for any error messages in the app

## Development

### Testing Without Bluetooth

The bridge works standalone for WebSocket testing:

1. Start the bridge
2. Connect via WebSocket: `ws://localhost:8765`
3. Send handshake message
4. Test message flow

### Debugging

Enable verbose logging by modifying `BridgeServer.swift`:

```swift
// Change print statements to use os_log for better debugging
import os.log
let logger = Logger(subsystem: "io.soundchain.bridge", category: "network")
```

## License

Part of SoundChain - The Future of Music

Patent-pending Bridge Protocol for Web-to-Native Mesh Communication

---

Built with ❤️ by the SoundChain Team
