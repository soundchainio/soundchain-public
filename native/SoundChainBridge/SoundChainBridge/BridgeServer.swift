/**
 * SoundChain Bridge Server - Native iOS Companion App
 *
 * This Swift code provides the native side of the Web-to-Bluetooth bridge.
 * It runs a local WebSocket server and bridges to Bluetooth mesh.
 *
 * Architecture:
 * - WebSocket server on localhost:8765
 * - Multipeer Connectivity for Bluetooth mesh
 * - Bitchat protocol compatibility
 *
 * @author SoundChain Team
 * @patent-pending Bridge Protocol for Web-to-Native Mesh Communication
 *
 * BUILD INSTRUCTIONS:
 * 1. Create new iOS app in Xcode
 * 2. Add this file and supporting files
 * 3. Add dependencies: Starscream (WebSocket), or use URLSessionWebSocketTask
 * 4. Enable Background Modes: Audio, Bluetooth
 * 5. Add Info.plist permissions for Bluetooth and Local Network
 */

import Foundation
import MultipeerConnectivity
import Network
import UIKit

// MARK: - Bridge Protocol Types

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

struct BridgeMessage: Codable {
    let type: BridgeMessageType
    let payload: [String: Any]
    let timestamp: Int64
    let id: String

    enum CodingKeys: String, CodingKey {
        case type, payload, timestamp, id
    }

    // Custom encoding/decoding for payload
    init(type: BridgeMessageType, payload: [String: Any], timestamp: Int64 = Int64(Date().timeIntervalSince1970 * 1000), id: String = UUID().uuidString) {
        self.type = type
        self.payload = payload
        self.timestamp = timestamp
        self.id = id
    }
}

struct NearbyDevice: Codable {
    let id: String
    let name: String
    let rssi: Int
    let lastSeen: Int64
    let isBitchat: Bool
}

// MARK: - WebSocket Server

class BridgeWebSocketServer: NSObject {
    private var listener: NWListener?
    private var connections: [NWConnection] = []
    private let port: UInt16 = 8765

    weak var delegate: BridgeServerDelegate?

    func start() {
        do {
            let parameters = NWParameters.tcp
            parameters.allowLocalEndpointReuse = true

            listener = try NWListener(using: parameters, on: NWEndpoint.Port(rawValue: port)!)

            listener?.stateUpdateHandler = { [weak self] state in
                switch state {
                case .ready:
                    print("🌉 Bridge Server: Listening on port \(self?.port ?? 0)")
                case .failed(let error):
                    print("🌉 Bridge Server: Failed - \(error)")
                default:
                    break
                }
            }

            listener?.newConnectionHandler = { [weak self] connection in
                self?.handleNewConnection(connection)
            }

            listener?.start(queue: .main)

        } catch {
            print("🌉 Bridge Server: Failed to start - \(error)")
        }
    }

    private func handleNewConnection(_ connection: NWConnection) {
        print("🌉 Bridge Server: New connection")
        connections.append(connection)

        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                print("🌉 Bridge Server: Connection ready")
                self?.receiveMessage(on: connection)
            case .failed(let error):
                print("🌉 Bridge Server: Connection failed - \(error)")
                self?.removeConnection(connection)
            case .cancelled:
                self?.removeConnection(connection)
            default:
                break
            }
        }

        connection.start(queue: .main)
    }

    private func receiveMessage(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            if let data = data, !data.isEmpty {
                self?.handleMessage(data, from: connection)
            }

            if let error = error {
                print("🌉 Bridge Server: Receive error - \(error)")
                return
            }

            if !isComplete {
                self?.receiveMessage(on: connection)
            }
        }
    }

    private func handleMessage(_ data: Data, from connection: NWConnection) {
        // Parse WebSocket frame (simplified - use proper WS library in production)
        guard let message = parseWebSocketMessage(data) else { return }

        print("🌉 Bridge Server: Received \(message.type)")

        switch message.type {
        case .handshake:
            handleHandshake(message, connection: connection)
        case .chatMessage:
            handleChatMessage(message, connection: connection)
        case .meshStatus:
            sendMeshStatus(to: connection)
        case .ping:
            sendPong(to: connection)
        default:
            break
        }
    }

    private func handleHandshake(_ message: BridgeMessage, connection: NWConnection) {
        let ack = BridgeMessage(
            type: .handshakeAck,
            payload: [
                "version": "1.0.0",
                "bluetoothEnabled": true,
                "deviceCount": delegate?.getDeviceCount() ?? 0
            ]
        )
        send(ack, to: connection)
    }

    private func handleChatMessage(_ message: BridgeMessage, connection: NWConnection) {
        guard let content = message.payload["content"] as? String,
              let geohash = message.payload["geohash"] as? String else { return }

        // Forward to Bluetooth mesh
        delegate?.broadcastToMesh(content: content, geohash: geohash)
    }

    private func sendMeshStatus(to connection: NWConnection) {
        let devices = delegate?.getNearbyDevices() ?? []
        let status = BridgeMessage(
            type: .meshStatus,
            payload: [
                "isConnected": true,
                "bluetoothEnabled": true,
                "deviceCount": devices.count,
                "devices": devices.map { device in
                    [
                        "id": device.id,
                        "name": device.name,
                        "rssi": device.rssi,
                        "lastSeen": device.lastSeen,
                        "isBitchat": device.isBitchat
                    ]
                }
            ]
        )
        send(status, to: connection)
    }

    private func sendPong(to connection: NWConnection) {
        let pong = BridgeMessage(type: .pong, payload: [:])
        send(pong, to: connection)
    }

    func broadcastChatReceived(content: String, pubkey: String, geohash: String) {
        let message = BridgeMessage(
            type: .chatReceived,
            payload: [
                "content": content,
                "pubkey": pubkey,
                "geohash": geohash,
                "timestamp": Int64(Date().timeIntervalSince1970),
                "source": "bluetooth"
            ]
        )
        broadcast(message)
    }

    func broadcastDeviceJoined(_ device: NearbyDevice) {
        let message = BridgeMessage(
            type: .deviceJoined,
            payload: ["device": [
                "id": device.id,
                "name": device.name,
                "rssi": device.rssi,
                "lastSeen": device.lastSeen,
                "isBitchat": device.isBitchat
            ]]
        )
        broadcast(message)
    }

    private func broadcast(_ message: BridgeMessage) {
        for connection in connections {
            send(message, to: connection)
        }
    }

    private func send(_ message: BridgeMessage, to connection: NWConnection) {
        guard let data = encodeWebSocketMessage(message) else { return }
        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("🌉 Bridge Server: Send error - \(error)")
            }
        })
    }

    private func removeConnection(_ connection: NWConnection) {
        connections.removeAll { $0 === connection }
    }

    // Simplified WebSocket parsing - use proper library in production
    private func parseWebSocketMessage(_ data: Data) -> BridgeMessage? {
        // This is simplified - real implementation needs proper WebSocket frame parsing
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let typeString = json["type"] as? String,
              let type = BridgeMessageType(rawValue: typeString) else { return nil }

        return BridgeMessage(
            type: type,
            payload: json["payload"] as? [String: Any] ?? [:],
            timestamp: json["timestamp"] as? Int64 ?? 0,
            id: json["id"] as? String ?? ""
        )
    }

    private func encodeWebSocketMessage(_ message: BridgeMessage) -> Data? {
        let dict: [String: Any] = [
            "type": message.type.rawValue,
            "payload": message.payload,
            "timestamp": message.timestamp,
            "id": message.id
        ]
        return try? JSONSerialization.data(withJSONObject: dict)
    }

    func stop() {
        listener?.cancel()
        connections.forEach { $0.cancel() }
        connections.removeAll()
    }
}

// MARK: - Bridge Server Delegate

protocol BridgeServerDelegate: AnyObject {
    func broadcastToMesh(content: String, geohash: String)
    func getDeviceCount() -> Int
    func getNearbyDevices() -> [NearbyDevice]
}

// MARK: - Bluetooth Mesh Manager (Multipeer Connectivity)

class BluetoothMeshManager: NSObject, BridgeServerDelegate {
    private var peerID: MCPeerID!
    private var session: MCSession!
    private var advertiser: MCNearbyServiceAdvertiser!
    private var browser: MCNearbyServiceBrowser!

    private let serviceType = "soundchain-mesh" // Must be 15 chars or less
    private var nearbyDevices: [NearbyDevice] = []

    weak var server: BridgeWebSocketServer?
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

    func startMesh() {
        advertiser.startAdvertisingPeer()
        browser.startBrowsingForPeers()
        print("🔷 Mesh: Started advertising and browsing")
    }

    func stopMesh() {
        advertiser.stopAdvertisingPeer()
        browser.stopBrowsingForPeers()
        session.disconnect()
    }

    // MARK: - BridgeServerDelegate

    func broadcastToMesh(content: String, geohash: String) {
        let message: [String: Any] = [
            "type": "chat",
            "content": content,
            "geohash": geohash,
            "pubkey": peerID.displayName,
            "timestamp": Int64(Date().timeIntervalSince1970)
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              !session.connectedPeers.isEmpty else { return }

        do {
            try session.send(data, toPeers: session.connectedPeers, with: .reliable)
            print("🔷 Mesh: Broadcast message to \(session.connectedPeers.count) peers")
        } catch {
            print("🔷 Mesh: Failed to send - \(error)")
        }
    }

    func getDeviceCount() -> Int {
        return session.connectedPeers.count
    }

    func getNearbyDevices() -> [NearbyDevice] {
        return nearbyDevices
    }
}

// MARK: - MCSession Delegate

extension BluetoothMeshManager: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        DispatchQueue.main.async { [weak self] in
            switch state {
            case .connected:
                print("🔷 Mesh: Connected to \(peerID.displayName)")
                let device = NearbyDevice(
                    id: peerID.displayName,
                    name: peerID.displayName,
                    rssi: -50, // Estimated
                    lastSeen: Int64(Date().timeIntervalSince1970 * 1000),
                    isBitchat: peerID.displayName.contains("Bitchat")
                )
                self?.nearbyDevices.append(device)
                self?.server?.broadcastDeviceJoined(device)

            case .notConnected:
                print("🔷 Mesh: Disconnected from \(peerID.displayName)")
                self?.nearbyDevices.removeAll { $0.id == peerID.displayName }

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

        // Forward to web app via WebSocket
        DispatchQueue.main.async { [weak self] in
            self?.server?.broadcastChatReceived(content: content, pubkey: pubkey, geohash: geohash)
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
    }
}

// MARK: - Main Bridge Controller

class SoundChainBridge {
    let server = BridgeWebSocketServer()
    let mesh = BluetoothMeshManager()

    func start() {
        mesh.server = server
        server.delegate = mesh

        server.start()
        mesh.startMesh()

        print("🌉 SoundChain Bridge: Started")
        print("🌉 Web app can connect to ws://localhost:8765")
    }

    func stop() {
        server.stop()
        mesh.stopMesh()
    }
}

/**
 * USAGE IN APP DELEGATE:
 *
 * let bridge = SoundChainBridge()
 *
 * func application(_ application: UIApplication, didFinishLaunchingWithOptions...) {
 *     bridge.start()
 * }
 *
 * REQUIRED INFO.PLIST ENTRIES:
 *
 * <key>NSLocalNetworkUsageDescription</key>
 * <string>SoundChain Bridge needs local network access to communicate with the web app.</string>
 *
 * <key>NSBonjourServices</key>
 * <array>
 *     <string>_soundchain-mesh._tcp</string>
 * </array>
 *
 * <key>NSBluetoothAlwaysUsageDescription</key>
 * <string>SoundChain Bridge uses Bluetooth to connect with nearby users.</string>
 *
 * <key>UIBackgroundModes</key>
 * <array>
 *     <string>bluetooth-central</string>
 *     <string>bluetooth-peripheral</string>
 * </array>
 */
