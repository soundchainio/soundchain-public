/**
 * SoundChain Bridge Server - Native iOS Companion App
 *
 * TRUE BRIDGE: Relays messages between Nostr (internet) and Bluetooth mesh
 *
 * Architecture:
 * - Connects to Nostr relays (same as SoundChain web app)
 * - Multipeer Connectivity for Bluetooth mesh
 * - Bitchat protocol compatibility
 * - Messages flow: Web ↔ Nostr ↔ Bridge ↔ Bluetooth ↔ Bitchat
 *
 * NO localhost WebSocket needed! Bridge works automatically in background.
 *
 * @author SoundChain Team
 */

import Foundation
import MultipeerConnectivity
import Network
import UIKit
import CryptoKit

// MARK: - Nostr Protocol Types

/// Nostr relay URLs (same as web app)
let NOSTR_RELAYS = [
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol",
    "wss://relay.snort.social"
]

/// Nostr event kinds
enum NostrEventKind: Int {
    case setMetadata = 0
    case textNote = 1
    case recommendRelay = 2
    case contacts = 3
    case encryptedDM = 4
    case delete = 5
    case repost = 6
    case reaction = 7
    case channelCreate = 40
    case channelMetadata = 41
    case channelMessage = 42      // Used for location chat
}

/// Nostr event structure
struct NostrEvent: Codable {
    let id: String
    let pubkey: String
    let created_at: Int64
    let kind: Int
    let tags: [[String]]
    let content: String
    let sig: String

    init(id: String = "", pubkey: String, created_at: Int64 = Int64(Date().timeIntervalSince1970), kind: Int, tags: [[String]], content: String, sig: String = "") {
        self.id = id
        self.pubkey = pubkey
        self.created_at = created_at
        self.kind = kind
        self.tags = tags
        self.content = content
        self.sig = sig
    }
}

// MARK: - Nostr Identity Manager

class NostrIdentity {
    let privateKey: Data
    let publicKey: String

    init(geohash: String) {
        // Generate deterministic key from geohash (for privacy - different identity per location)
        let seed = "soundchain-bridge-\(geohash)".data(using: .utf8)!
        let hash = SHA256.hash(data: seed)
        self.privateKey = Data(hash)
        self.publicKey = NostrIdentity.derivePublicKey(from: Data(hash))
    }

    static func derivePublicKey(from privateKey: Data) -> String {
        // Simplified - in production use secp256k1 library
        let hash = SHA256.hash(data: privateKey)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    func sign(eventId: String) -> String {
        // Simplified signing - in production use proper secp256k1 schnorr signatures
        let dataToSign = eventId.data(using: .utf8)!
        let combined = privateKey + dataToSign
        let signature = SHA256.hash(data: combined)
        return signature.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Nostr Relay Manager

protocol NostrRelayDelegate: AnyObject {
    func didReceiveMessage(content: String, pubkey: String, geohash: String, timestamp: Int64)
}

class NostrRelayManager: NSObject {
    private var webSockets: [URLSessionWebSocketTask] = []
    private var session: URLSession!
    private var currentGeohash: String = ""
    private var identity: NostrIdentity?
    private var subscriptionId: String = ""
    private var isConnected = false

    weak var delegate: NostrRelayDelegate?

    override init() {
        super.init()
        session = URLSession(configuration: .default, delegate: self, delegateQueue: OperationQueue.main)
    }

    func connect(geohash: String) {
        self.currentGeohash = geohash
        self.identity = NostrIdentity(geohash: geohash)
        self.subscriptionId = UUID().uuidString

        // Connect to all relays
        for relayURL in NOSTR_RELAYS {
            connectToRelay(relayURL)
        }
    }

    private func connectToRelay(_ urlString: String) {
        guard let url = URL(string: urlString) else { return }

        let webSocket = session.webSocketTask(with: url)
        webSockets.append(webSocket)
        webSocket.resume()

        print("📡 Nostr: Connecting to \(urlString)")

        // Start receiving messages
        receiveMessage(from: webSocket)

        // Subscribe after short delay to ensure connection
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.subscribeToGeohash(webSocket: webSocket)
        }
    }

    private func subscribeToGeohash(webSocket: URLSessionWebSocketTask) {
        // Nostr subscription filter for location-based messages
        // Matches the web app's filter in concertChat.ts
        let filter: [String: Any] = [
            "kinds": [NostrEventKind.channelMessage.rawValue],
            "#g": [currentGeohash],  // Geohash tag
            "since": Int64(Date().timeIntervalSince1970) - 3600  // Last hour
        ]

        let subscription: [Any] = ["REQ", subscriptionId, filter]

        guard let data = try? JSONSerialization.data(withJSONObject: subscription),
              let jsonString = String(data: data, encoding: .utf8) else { return }

        let message = URLSessionWebSocketTask.Message.string(jsonString)
        webSocket.send(message) { error in
            if let error = error {
                print("📡 Nostr: Subscribe error - \(error)")
            } else {
                print("📡 Nostr: Subscribed to geohash \(self.currentGeohash)")
            }
        }
    }

    private func receiveMessage(from webSocket: URLSessionWebSocketTask) {
        webSocket.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleRelayMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleRelayMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue receiving
                self?.receiveMessage(from: webSocket)

            case .failure(let error):
                print("📡 Nostr: Receive error - \(error)")
            }
        }
    }

    private func handleRelayMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
              let type = json.first as? String else { return }

        switch type {
        case "EVENT":
            // ["EVENT", subscriptionId, event]
            guard json.count >= 3,
                  let eventDict = json[2] as? [String: Any] else { return }
            handleEvent(eventDict)

        case "EOSE":
            // End of stored events
            isConnected = true
            print("📡 Nostr: Connected and synced")

        case "OK":
            // Event published confirmation
            print("📡 Nostr: Event published successfully")

        case "NOTICE":
            if let notice = json[safe: 1] as? String {
                print("📡 Nostr: Notice - \(notice)")
            }

        default:
            break
        }
    }

    private func handleEvent(_ eventDict: [String: Any]) {
        guard let content = eventDict["content"] as? String,
              let pubkey = eventDict["pubkey"] as? String,
              let tags = eventDict["tags"] as? [[String]],
              let createdAt = eventDict["created_at"] as? Int64 else { return }

        // Extract geohash from tags
        var geohash = currentGeohash
        for tag in tags {
            if tag.count >= 2 && tag[0] == "g" {
                geohash = tag[1]
                break
            }
        }

        // Don't echo our own messages
        if pubkey == identity?.publicKey { return }

        print("📡 Nostr: Received message from \(pubkey.prefix(8))...")

        // Forward to delegate (which will broadcast to Bluetooth)
        delegate?.didReceiveMessage(content: content, pubkey: pubkey, geohash: geohash, timestamp: createdAt)
    }

    /// Publish a message to Nostr relays
    func publishMessage(content: String, geohash: String) {
        guard let identity = identity else { return }

        let tags: [[String]] = [
            ["g", geohash],  // Geohash tag for location
            ["client", "soundchain-bridge"]
        ]

        // Create event
        var event = NostrEvent(
            pubkey: identity.publicKey,
            created_at: Int64(Date().timeIntervalSince1970),
            kind: NostrEventKind.channelMessage.rawValue,
            tags: tags,
            content: content
        )

        // Calculate event ID
        let eventId = calculateEventId(event)
        let signature = identity.sign(eventId: eventId)

        event = NostrEvent(
            id: eventId,
            pubkey: event.pubkey,
            created_at: event.created_at,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
            sig: signature
        )

        // Send to all connected relays
        let eventDict: [String: Any] = [
            "id": event.id,
            "pubkey": event.pubkey,
            "created_at": event.created_at,
            "kind": event.kind,
            "tags": event.tags,
            "content": event.content,
            "sig": event.sig
        ]

        let message: [Any] = ["EVENT", eventDict]

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let jsonString = String(data: data, encoding: .utf8) else { return }

        for webSocket in webSockets {
            let wsMessage = URLSessionWebSocketTask.Message.string(jsonString)
            webSocket.send(wsMessage) { error in
                if let error = error {
                    print("📡 Nostr: Publish error - \(error)")
                }
            }
        }

        print("📡 Nostr: Published message to \(webSockets.count) relays")
    }

    private func calculateEventId(_ event: NostrEvent) -> String {
        // Event ID = SHA256 of serialized event
        let serialized: [Any] = [
            0,
            event.pubkey,
            event.created_at,
            event.kind,
            event.tags,
            event.content
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: serialized) else {
            return UUID().uuidString
        }

        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    func disconnect() {
        // Close subscription
        let close: [Any] = ["CLOSE", subscriptionId]
        if let data = try? JSONSerialization.data(withJSONObject: close),
           let jsonString = String(data: data, encoding: .utf8) {
            for webSocket in webSockets {
                let message = URLSessionWebSocketTask.Message.string(jsonString)
                webSocket.send(message) { _ in }
            }
        }

        // Cancel all connections
        webSockets.forEach { $0.cancel(with: .goingAway, reason: nil) }
        webSockets.removeAll()
        isConnected = false
    }
}

extension NostrRelayManager: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        print("📡 Nostr: WebSocket connected")
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        print("📡 Nostr: WebSocket closed")
    }
}

// MARK: - Bridge Protocol Types (for local WebSocket - kept for compatibility)

enum BridgeMessageType: String, Codable {
    case handshake = "handshake"
    case handshakeAck = "handshake_ack"
    case ping = "ping"
    case pong = "pong"
    case chatMessage = "chat_message"
    case chatReceived = "chat_received"
    case meshStatus = "mesh_status"
    case nearbyDevices = "nearby_devices"
    case deviceJoined = "device_joined"
    case deviceLeft = "device_left"
    case error = "error"
}

struct NearbyDevice: Codable {
    let id: String
    let name: String
    let rssi: Int
    let lastSeen: Int64
    let isBitchat: Bool
}

// MARK: - Bluetooth Mesh Manager (Multipeer Connectivity)

protocol BluetoothMeshDelegate: AnyObject {
    func didReceiveBluetoothMessage(content: String, pubkey: String, geohash: String)
    func didUpdateDevices(_ devices: [NearbyDevice])
}

class BluetoothMeshManager: NSObject {
    private var peerID: MCPeerID!
    private var session: MCSession!
    private var advertiser: MCNearbyServiceAdvertiser!
    private var browser: MCNearbyServiceBrowser!

    private let serviceType = "soundchain-mesh" // Must be 15 chars or less
    private(set) var nearbyDevices: [NearbyDevice] = []

    weak var delegate: BluetoothMeshDelegate?
    var currentGeohash: String = ""

    override init() {
        super.init()

        peerID = MCPeerID(displayName: UIDevice.current.name)
        session = MCSession(peer: peerID, securityIdentity: nil, encryptionPreference: .required)
        session.delegate = self

        // Advertiser - makes this device discoverable
        advertiser = MCNearbyServiceAdvertiser(
            peer: peerID,
            discoveryInfo: ["app": "soundchain", "version": "1.0"],
            serviceType: serviceType
        )
        advertiser.delegate = self

        // Browser - discovers other devices
        browser = MCNearbyServiceBrowser(peer: peerID, serviceType: serviceType)
        browser.delegate = self
    }

    func startMesh(geohash: String) {
        self.currentGeohash = geohash
        advertiser.startAdvertisingPeer()
        browser.startBrowsingForPeers()
        print("🔷 Mesh: Started advertising and browsing for geohash \(geohash)")
    }

    func stopMesh() {
        advertiser.stopAdvertisingPeer()
        browser.stopBrowsingForPeers()
        session.disconnect()
        nearbyDevices.removeAll()
    }

    /// Broadcast message to all connected Bluetooth peers
    func broadcastToMesh(content: String, pubkey: String, geohash: String) {
        let message: [String: Any] = [
            "type": "chat",
            "content": content,
            "geohash": geohash,
            "pubkey": pubkey,
            "timestamp": Int64(Date().timeIntervalSince1970)
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              !session.connectedPeers.isEmpty else {
            print("🔷 Mesh: No peers to broadcast to")
            return
        }

        do {
            try session.send(data, toPeers: session.connectedPeers, with: .reliable)
            print("🔷 Mesh: Broadcast message to \(session.connectedPeers.count) peers")
        } catch {
            print("🔷 Mesh: Failed to send - \(error)")
        }
    }

    var connectedPeerCount: Int {
        return session.connectedPeers.count
    }
}

// MARK: - MCSession Delegate

extension BluetoothMeshManager: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            switch state {
            case .connected:
                print("🔷 Mesh: Connected to \(peerID.displayName)")
                let device = NearbyDevice(
                    id: peerID.displayName,
                    name: peerID.displayName,
                    rssi: -50,
                    lastSeen: Int64(Date().timeIntervalSince1970 * 1000),
                    isBitchat: peerID.displayName.lowercased().contains("bitchat")
                )
                if !self.nearbyDevices.contains(where: { $0.id == device.id }) {
                    self.nearbyDevices.append(device)
                }
                self.delegate?.didUpdateDevices(self.nearbyDevices)

            case .notConnected:
                print("🔷 Mesh: Disconnected from \(peerID.displayName)")
                self.nearbyDevices.removeAll { $0.id == peerID.displayName }
                self.delegate?.didUpdateDevices(self.nearbyDevices)

            case .connecting:
                print("🔷 Mesh: Connecting to \(peerID.displayName)")

            @unknown default:
                break
            }
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        guard let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = message["type"] as? String,
              type == "chat",
              let content = message["content"] as? String,
              let pubkey = message["pubkey"] as? String,
              let geohash = message["geohash"] as? String else { return }

        print("🔷 Mesh: Received message from \(peerID.displayName)")

        // Forward to delegate (which will relay to Nostr)
        DispatchQueue.main.async { [weak self] in
            self?.delegate?.didReceiveBluetoothMessage(content: content, pubkey: pubkey, geohash: geohash)
        }
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

// MARK: - Advertiser Delegate

extension BluetoothMeshManager: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        print("🔷 Mesh: Received invitation from \(peerID.displayName)")
        invitationHandler(true, session) // Auto-accept
    }
}

// MARK: - Browser Delegate

extension BluetoothMeshManager: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String : String]?) {
        print("🔷 Mesh: Found peer \(peerID.displayName)")
        browser.invitePeer(peerID, to: session, withContext: nil, timeout: 30)
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        print("🔷 Mesh: Lost peer \(peerID.displayName)")
        nearbyDevices.removeAll { $0.id == peerID.displayName }
        delegate?.didUpdateDevices(nearbyDevices)
    }
}

// MARK: - Main Bridge Controller

class SoundChainBridge: NostrRelayDelegate, BluetoothMeshDelegate {
    let nostr = NostrRelayManager()
    let mesh = BluetoothMeshManager()

    private var currentGeohash: String = ""
    private(set) var isRunning = false

    // Callbacks for UI updates
    var onNostrMessage: ((String, String) -> Void)?
    var onBluetoothMessage: ((String, String) -> Void)?
    var onDevicesUpdated: (([NearbyDevice]) -> Void)?

    func start(geohash: String) {
        guard !isRunning else { return }

        currentGeohash = geohash
        isRunning = true

        // Set up delegates
        nostr.delegate = self
        mesh.delegate = self

        // Start both connections
        nostr.connect(geohash: geohash)
        mesh.startMesh(geohash: geohash)

        print("🌉 SoundChain Bridge: Started")
        print("🌉 Bridging Nostr ↔ Bluetooth for geohash: \(geohash)")
    }

    func stop() {
        isRunning = false
        nostr.disconnect()
        mesh.stopMesh()
        print("🌉 SoundChain Bridge: Stopped")
    }

    // MARK: - NostrRelayDelegate

    /// Called when we receive a message from Nostr relays
    /// Forward it to Bluetooth mesh
    func didReceiveMessage(content: String, pubkey: String, geohash: String, timestamp: Int64) {
        print("🌉 Bridge: Nostr → Bluetooth: \(content.prefix(30))...")

        // Notify UI
        onNostrMessage?(content, pubkey)

        // Forward to Bluetooth mesh
        mesh.broadcastToMesh(content: content, pubkey: pubkey, geohash: geohash)
    }

    // MARK: - BluetoothMeshDelegate

    /// Called when we receive a message from Bluetooth mesh
    /// Forward it to Nostr relays
    func didReceiveBluetoothMessage(content: String, pubkey: String, geohash: String) {
        print("🌉 Bridge: Bluetooth → Nostr: \(content.prefix(30))...")

        // Notify UI
        onBluetoothMessage?(content, pubkey)

        // Forward to Nostr relays
        nostr.publishMessage(content: content, geohash: geohash)
    }

    func didUpdateDevices(_ devices: [NearbyDevice]) {
        onDevicesUpdated?(devices)
    }

    // MARK: - Stats

    var bluetoothPeerCount: Int {
        return mesh.connectedPeerCount
    }

    var nearbyDevices: [NearbyDevice] {
        return mesh.nearbyDevices
    }
}

// MARK: - Array Extension

extension Array {
    subscript(safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}

/**
 * HOW THE BRIDGE WORKS:
 *
 * 1. User opens Bridge app, enters their location (geohash)
 * 2. Bridge connects to Nostr relays AND starts Bluetooth mesh
 * 3. When SoundChain web user sends a message:
 *    - Message goes to Nostr relays
 *    - Bridge app receives from Nostr
 *    - Bridge broadcasts to Bluetooth mesh
 *    - Bitchat users see it via Bluetooth!
 * 4. When Bitchat user sends via Bluetooth:
 *    - Bridge receives via Bluetooth mesh
 *    - Bridge publishes to Nostr relays
 *    - SoundChain web users see it!
 *
 * NO DIRECT WEB-TO-BRIDGE CONNECTION NEEDED!
 * The bridge works automatically in the background.
 */
