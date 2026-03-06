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
import CoreBluetooth

// MARK: - Bitchat BLE Constants
/// UUIDs from Bitchat's open source code - enables direct communication with Bitchat users!
struct BitchatBLE {
    static let serviceUUID = CBUUID(string: "F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A")  // Testnet
    static let mainnetServiceUUID = CBUUID(string: "F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C")  // Mainnet
    static let characteristicUUID = CBUUID(string: "A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D")
}

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
    case channelMessage = 42
    case ephemeral = 20000        // SoundChain/Bitchat location chat
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
        // Matches the web app's filter in concertChat.ts - uses kind 20000 (ephemeral)
        // Use geohash prefix (6 chars) to catch nearby users with slightly different positions
        let geohashPrefix = String(currentGeohash.prefix(6))

        // Subscribe to multiple geohash variations to catch nearby users
        let filter: [String: Any] = [
            "kinds": [NostrEventKind.ephemeral.rawValue],  // 20000 - same as web app!
            "#g": [currentGeohash, geohashPrefix],  // Both exact and prefix match
            "since": Int64(Date().timeIntervalSince1970) - 3600  // Last hour
        ]

        let subscription: [Any] = ["REQ", subscriptionId, filter]
        print("📡 Nostr: Subscribing to geohash \(currentGeohash) and prefix \(geohashPrefix)")

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

        print("📡 Nostr: Received message from \(pubkey.prefix(8))... geohash=\(geohash)")
        print("📡 Nostr: Content: \(content)")

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

        // Create event - use kind 20000 (ephemeral) to match web app
        var event = NostrEvent(
            pubkey: identity.publicKey,
            created_at: Int64(Date().timeIntervalSince1970),
            kind: NostrEventKind.ephemeral.rawValue,  // 20000 - same as web!
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

// MARK: - Bitchat BLE Manager (CoreBluetooth - communicates directly with Bitchat!)

protocol BitchatBLEDelegate: AnyObject {
    func didDiscoverBitchatDevice(id: String, name: String, rssi: Int)
    func didReceiveBitchatMessage(data: Data, from deviceId: String)
    func didConnectToBitchat(deviceId: String)
    func didDisconnectFromBitchat(deviceId: String)
}

class BitchatBLEManager: NSObject {
    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!
    private var discoveredPeripherals: [UUID: CBPeripheral] = [:]
    private var connectedPeripherals: [UUID: CBPeripheral] = [:]
    private var characteristics: [UUID: CBCharacteristic] = [:]

    weak var delegate: BitchatBLEDelegate?
    private(set) var isScanning = false
    private var shouldStartScanning = false
    private var shouldStartAdvertising = false

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: DispatchQueue.main)
        peripheralManager = CBPeripheralManager(delegate: self, queue: DispatchQueue.main)
    }

    func startScanning() {
        shouldStartScanning = true

        guard centralManager.state == .poweredOn else {
            print("🔵 Bitchat BLE: Central not ready yet, will start when powered on")
            return
        }

        isScanning = true
        // Scan for both testnet and mainnet Bitchat devices
        centralManager.scanForPeripherals(
            withServices: [BitchatBLE.serviceUUID, BitchatBLE.mainnetServiceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
        print("🔵 Bitchat BLE: Started scanning for Bitchat devices...")
    }

    func stopScanning() {
        shouldStartScanning = false
        isScanning = false
        if centralManager.state == .poweredOn {
            centralManager.stopScan()
        }
        print("🔵 Bitchat BLE: Stopped scanning")
    }

    func startAdvertising() {
        shouldStartAdvertising = true

        guard peripheralManager.state == .poweredOn else {
            print("🔵 Bitchat BLE: Peripheral not ready yet, will start when powered on")
            return
        }

        // Create the characteristic
        let characteristic = CBMutableCharacteristic(
            type: BitchatBLE.characteristicUUID,
            properties: [.read, .write, .writeWithoutResponse, .notify],
            value: nil,
            permissions: [.readable, .writeable]
        )

        // Create the service
        let service = CBMutableService(type: BitchatBLE.serviceUUID, primary: true)
        service.characteristics = [characteristic]

        peripheralManager.add(service)

        // Start advertising
        peripheralManager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [BitchatBLE.serviceUUID],
            CBAdvertisementDataLocalNameKey: "SoundChain-Bridge"
        ])
        print("🔵 Bitchat BLE: Started advertising as Bitchat-compatible device")
    }

    func stopAdvertising() {
        shouldStartAdvertising = false
        if peripheralManager.state == .poweredOn {
            peripheralManager.stopAdvertising()
            peripheralManager.removeAllServices()
        }
    }

    func sendToBitchat(data: Data) {
        for (_, peripheral) in connectedPeripherals {
            if let characteristic = characteristics[peripheral.identifier] {
                peripheral.writeValue(data, for: characteristic, type: .withoutResponse)
                print("🔵 Bitchat BLE: Sent \(data.count) bytes to \(peripheral.name ?? "unknown")")
            }
        }
    }

    func disconnect() {
        stopScanning()
        stopAdvertising()
        for (_, peripheral) in connectedPeripherals {
            centralManager.cancelPeripheralConnection(peripheral)
        }
        connectedPeripherals.removeAll()
        discoveredPeripherals.removeAll()
    }
}

// MARK: - CBCentralManager Delegate (scanning for Bitchat devices)

extension BitchatBLEManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("🔵 Bitchat BLE: Central powered on")
            if shouldStartScanning {
                startScanning()
            }
        case .poweredOff:
            print("🔵 Bitchat BLE: Bluetooth is off")
        case .unauthorized:
            print("🔵 Bitchat BLE: Bluetooth unauthorized")
        default:
            print("🔵 Bitchat BLE: Central state: \(central.state.rawValue)")
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let deviceId = peripheral.identifier.uuidString
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Bitchat Device"

        print("🔵 Bitchat BLE: Discovered \(name) (RSSI: \(RSSI))")

        discoveredPeripherals[peripheral.identifier] = peripheral
        delegate?.didDiscoverBitchatDevice(id: deviceId, name: name, rssi: RSSI.intValue)

        // Auto-connect to discovered Bitchat devices
        peripheral.delegate = self
        centralManager.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("🔵 Bitchat BLE: Connected to \(peripheral.name ?? "unknown")")
        connectedPeripherals[peripheral.identifier] = peripheral
        delegate?.didConnectToBitchat(deviceId: peripheral.identifier.uuidString)

        // Discover services
        peripheral.discoverServices([BitchatBLE.serviceUUID, BitchatBLE.mainnetServiceUUID])
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("🔵 Bitchat BLE: Disconnected from \(peripheral.name ?? "unknown")")
        connectedPeripherals.removeValue(forKey: peripheral.identifier)
        characteristics.removeValue(forKey: peripheral.identifier)
        delegate?.didDisconnectFromBitchat(deviceId: peripheral.identifier.uuidString)

        // Try to reconnect
        if isScanning {
            centralManager.connect(peripheral, options: nil)
        }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("🔵 Bitchat BLE: Failed to connect to \(peripheral.name ?? "unknown"): \(error?.localizedDescription ?? "unknown")")
    }
}

// MARK: - CBPeripheral Delegate (communicating with Bitchat)

extension BitchatBLEManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil else {
            print("🔵 Bitchat BLE: Service discovery error: \(error!)")
            return
        }

        for service in peripheral.services ?? [] {
            print("🔵 Bitchat BLE: Found service: \(service.uuid)")
            peripheral.discoverCharacteristics([BitchatBLE.characteristicUUID], for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard error == nil else {
            print("🔵 Bitchat BLE: Characteristic discovery error: \(error!)")
            return
        }

        for characteristic in service.characteristics ?? [] {
            if characteristic.uuid == BitchatBLE.characteristicUUID {
                print("🔵 Bitchat BLE: Found Bitchat characteristic!")
                characteristics[peripheral.identifier] = characteristic

                // Subscribe to notifications
                peripheral.setNotifyValue(true, for: characteristic)
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil, let data = characteristic.value else {
            return
        }

        print("🔵 Bitchat BLE: Received \(data.count) bytes from \(peripheral.name ?? "unknown")")
        delegate?.didReceiveBitchatMessage(data: data, from: peripheral.identifier.uuidString)
    }
}

// MARK: - CBPeripheralManager Delegate (advertising as Bitchat-compatible)

extension BitchatBLEManager: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        switch peripheral.state {
        case .poweredOn:
            print("🔵 Bitchat BLE: Peripheral powered on")
            if shouldStartAdvertising {
                startAdvertising()
            }
        default:
            print("🔵 Bitchat BLE: Peripheral state: \(peripheral.state.rawValue)")
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            if let data = request.value {
                print("🔵 Bitchat BLE: Received write: \(data.count) bytes")
                delegate?.didReceiveBitchatMessage(data: data, from: request.central.identifier.uuidString)
            }
            peripheral.respond(to: request, withResult: .success)
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error = error {
            print("🔵 Bitchat BLE: Failed to add service: \(error)")
        } else {
            print("🔵 Bitchat BLE: Service added successfully")
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error = error {
            print("🔵 Bitchat BLE: Advertising failed: \(error)")
        } else {
            print("🔵 Bitchat BLE: Advertising started successfully")
        }
    }
}

// MARK: - Main Bridge Controller

class SoundChainBridge: NostrRelayDelegate, BluetoothMeshDelegate, BitchatBLEDelegate {
    let nostr = NostrRelayManager()
    let mesh = BluetoothMeshManager()
    let bitchat = BitchatBLEManager()  // NEW: Direct Bitchat BLE communication!

    private var currentGeohash: String = ""
    private(set) var isRunning = false
    private(set) var bitchatDevices: [String: String] = [:]  // id -> name

    // Callbacks for UI updates
    var onNostrMessage: ((String, String) -> Void)?
    var onBluetoothMessage: ((String, String) -> Void)?
    var onDevicesUpdated: (([NearbyDevice]) -> Void)?
    var onBitchatDeviceFound: ((String, String) -> Void)?  // NEW

    func start(geohash: String) {
        guard !isRunning else { return }

        currentGeohash = geohash
        isRunning = true

        // Set up delegates
        nostr.delegate = self
        mesh.delegate = self
        bitchat.delegate = self  // NEW

        // Start all connections
        nostr.connect(geohash: geohash)
        mesh.startMesh(geohash: geohash)

        // NEW: Start Bitchat BLE scanning and advertising
        bitchat.startScanning()
        bitchat.startAdvertising()

        print("🌉 SoundChain Bridge: Started")
        print("🌉 Bridging Nostr ↔ Bluetooth ↔ Bitchat for geohash: \(geohash)")
    }

    func stop() {
        isRunning = false
        nostr.disconnect()
        mesh.stopMesh()
        bitchat.disconnect()  // NEW
        bitchatDevices.removeAll()
        print("🌉 SoundChain Bridge: Stopped")
    }

    // MARK: - NostrRelayDelegate

    /// Called when we receive a message from Nostr relays
    /// Forward it to Bluetooth mesh AND Bitchat devices
    func didReceiveMessage(content: String, pubkey: String, geohash: String, timestamp: Int64) {
        print("🌉 Bridge: Nostr → Bluetooth/Bitchat: \(content.prefix(30))...")

        // Notify UI
        onNostrMessage?(content, pubkey)

        // Forward to Multipeer Bluetooth mesh
        mesh.broadcastToMesh(content: content, pubkey: pubkey, geohash: geohash)

        // Forward to Bitchat devices via BLE
        sendToBitchatDevices(content: content, pubkey: pubkey, geohash: geohash)
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

    // MARK: - BitchatBLEDelegate

    /// Called when a Bitchat device is discovered via BLE
    func didDiscoverBitchatDevice(id: String, name: String, rssi: Int) {
        print("🌉 Bridge: Discovered Bitchat device: \(name) (RSSI: \(rssi))")
        bitchatDevices[id] = name

        // Notify UI
        onBitchatDeviceFound?(id, name)

        // Add to nearby devices list
        let device = NearbyDevice(
            id: id,
            name: name,
            rssi: rssi,
            lastSeen: Int64(Date().timeIntervalSince1970 * 1000),
            isBitchat: true
        )
        var devices = mesh.nearbyDevices
        if !devices.contains(where: { $0.id == id }) {
            devices.append(device)
            onDevicesUpdated?(devices)
        }
    }

    /// Called when we receive a message from a Bitchat device via BLE
    func didReceiveBitchatMessage(data: Data, from deviceId: String) {
        // Parse Bitchat message format
        // Bitchat uses a simple JSON format: {"type":"chat","content":"...","pubkey":"..."}
        guard let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = message["content"] as? String ?? String(data: data, encoding: .utf8) else {
            print("🌉 Bridge: Received non-text Bitchat data: \(data.count) bytes")
            return
        }

        let pubkey = message["pubkey"] as? String ?? "bitchat-\(deviceId.prefix(8))"
        let deviceName = bitchatDevices[deviceId] ?? "Bitchat"

        print("🌉 Bridge: Bitchat → Nostr: \(content.prefix(30))... from \(deviceName)")

        // Notify UI
        onBluetoothMessage?(content, pubkey)

        // Forward to Nostr relays (and other SoundChain web users!)
        nostr.publishMessage(content: content, geohash: currentGeohash)

        // Also forward to Multipeer mesh
        mesh.broadcastToMesh(content: content, pubkey: pubkey, geohash: currentGeohash)
    }

    /// Called when connected to a Bitchat device
    func didConnectToBitchat(deviceId: String) {
        let deviceName = bitchatDevices[deviceId] ?? "Bitchat"
        print("🌉 Bridge: Connected to Bitchat device: \(deviceName)")
    }

    /// Called when disconnected from a Bitchat device
    func didDisconnectFromBitchat(deviceId: String) {
        let deviceName = bitchatDevices[deviceId] ?? "Bitchat"
        print("🌉 Bridge: Disconnected from Bitchat device: \(deviceName)")
        bitchatDevices.removeValue(forKey: deviceId)
    }

    // MARK: - Send to Bitchat

    /// Forward a message to all connected Bitchat devices
    func sendToBitchatDevices(content: String, pubkey: String, geohash: String) {
        let message: [String: Any] = [
            "type": "chat",
            "content": content,
            "pubkey": pubkey,
            "geohash": geohash,
            "timestamp": Int64(Date().timeIntervalSince1970),
            "source": "soundchain"
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: message) else { return }
        bitchat.sendToBitchat(data: data)
    }

    // MARK: - Stats

    var bluetoothPeerCount: Int {
        return mesh.connectedPeerCount
    }

    var nearbyDevices: [NearbyDevice] {
        return mesh.nearbyDevices
    }

    var bitchatDeviceCount: Int {
        return bitchatDevices.count
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
