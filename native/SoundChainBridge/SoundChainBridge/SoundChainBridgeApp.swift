/**
 * SoundChain Bridge App
 *
 * Main entry point for the iOS Bridge app.
 * Bridges Nostr (internet) ↔ Bluetooth mesh for SoundChain/Bitchat interop.
 */

import SwiftUI
import CoreLocation

@main
struct SoundChainBridgeApp: App {
    @StateObject private var bridgeManager = BridgeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(bridgeManager)
        }
    }
}

// MARK: - Bridge Manager

class BridgeManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    // MARK: - Published State
    @Published var isRunning = false
    @Published var nostrConnected = false
    @Published var nearbyDevices: [NearbyDevice] = []
    @Published var recentMessages: [ChatMessage] = []
    @Published var messagesRelayed = 0

    // Location state
    @Published var currentGeohash: String?
    @Published var locationName: String?
    @Published var locationError: String?
    @Published var isLocating = false

    // MARK: - Private
    private var bridge: SoundChainBridge?
    private var locationManager: CLLocationManager?
    private let geocoder = CLGeocoder()

    // MARK: - Message Type
    struct ChatMessage: Identifiable {
        let id = UUID()
        let content: String
        let sender: String
        let timestamp: Date
        let source: MessageSource
    }

    enum MessageSource {
        case nostr
        case bluetooth
    }

    // MARK: - Init
    override init() {
        super.init()
        setupLocationManager()
    }

    // MARK: - Location

    private func setupLocationManager() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestLocation() {
        isLocating = true
        locationError = nil

        let status = locationManager?.authorizationStatus ?? .notDetermined

        switch status {
        case .notDetermined:
            locationManager?.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager?.requestLocation()
        case .denied, .restricted:
            locationError = "Location access denied. Enable in Settings."
            isLocating = false
        @unknown default:
            locationError = "Unknown location status"
            isLocating = false
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else { return }

        // Calculate geohash from coordinates (precision 6 = ~1.2km for better device matching)
        let geohash = calculateGeohash(lat: location.coordinate.latitude, lng: location.coordinate.longitude, precision: 6)
        currentGeohash = geohash
        isLocating = false

        // Reverse geocode for display name
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, error in
            DispatchQueue.main.async {
                if let placemark = placemarks?.first {
                    var parts: [String] = []
                    if let locality = placemark.locality { parts.append(locality) }
                    if let area = placemark.administrativeArea { parts.append(area) }
                    self?.locationName = parts.joined(separator: ", ")
                }
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationError = "Failed to get location: \(error.localizedDescription)"
        isLocating = false
    }

    // MARK: - Geohash Calculation

    private func calculateGeohash(lat: Double, lng: Double, precision: Int) -> String {
        let base32 = "0123456789bcdefghjkmnpqrstuvwxyz"
        var minLat = -90.0, maxLat = 90.0
        var minLng = -180.0, maxLng = 180.0
        var hash = ""
        var isEven = true
        var bit = 0
        var ch = 0

        while hash.count < precision {
            if isEven {
                let mid = (minLng + maxLng) / 2
                if lng > mid {
                    ch |= (1 << (4 - bit))
                    minLng = mid
                } else {
                    maxLng = mid
                }
            } else {
                let mid = (minLat + maxLat) / 2
                if lat > mid {
                    ch |= (1 << (4 - bit))
                    minLat = mid
                } else {
                    maxLat = mid
                }
            }
            isEven.toggle()
            bit += 1

            if bit == 5 {
                let index = base32.index(base32.startIndex, offsetBy: ch)
                hash.append(base32[index])
                bit = 0
                ch = 0
            }
        }
        return hash
    }

    // MARK: - Bridge Control

    func start() {
        guard let geohash = currentGeohash else {
            locationError = "Need location first"
            return
        }

        bridge = SoundChainBridge()

        // Set up callbacks
        bridge?.onNostrMessage = { [weak self] content, pubkey in
            DispatchQueue.main.async {
                self?.addMessage(content: content, sender: pubkey, source: .nostr)
                self?.messagesRelayed += 1
            }
        }

        bridge?.onBluetoothMessage = { [weak self] content, pubkey in
            DispatchQueue.main.async {
                self?.addMessage(content: content, sender: pubkey, source: .bluetooth)
                self?.messagesRelayed += 1
            }
        }

        bridge?.onDevicesUpdated = { [weak self] devices in
            DispatchQueue.main.async {
                self?.nearbyDevices = devices
            }
        }

        bridge?.start(geohash: geohash)
        isRunning = true
        nostrConnected = true  // Will be updated by actual connection status

        print("🌉 BridgeManager: Started for geohash \(geohash)")
    }

    func stop() {
        bridge?.stop()
        bridge = nil
        isRunning = false
        nostrConnected = false
        nearbyDevices = []

        print("🌉 BridgeManager: Stopped")
    }

    // MARK: - Send Message

    func sendMessage(_ content: String) {
        guard let geohash = currentGeohash, let bridge = bridge else {
            print("🌉 BridgeManager: Cannot send - bridge not running")
            return
        }

        // Publish to Nostr relays
        bridge.nostr.publishMessage(content: content, geohash: geohash)

        // Also broadcast to Bluetooth mesh
        let pubkey = "bridge-user"  // Simplified - in production use proper identity
        bridge.mesh.broadcastToMesh(content: content, pubkey: pubkey, geohash: geohash)

        // Also send to Bitchat devices
        bridge.sendToBitchatDevices(content: content, pubkey: pubkey, geohash: geohash)

        // Add to local messages
        addMessage(content: content, sender: "You", source: .nostr)
        messagesRelayed += 1

        print("🌉 BridgeManager: Sent message to all networks")
    }

    private func addMessage(content: String, sender: String, source: MessageSource) {
        let message = ChatMessage(
            content: content,
            sender: sender,
            timestamp: Date(),
            source: source
        )
        recentMessages.insert(message, at: 0)
        if recentMessages.count > 50 {
            recentMessages.removeLast()
        }
    }
}
