/**
 * SoundChain Bridge - Native iOS Companion App
 *
 * Main app entry point for the Web-to-Bluetooth bridge.
 * Enables SoundChain web app to communicate with Bitchat
 * users via Bluetooth mesh networking.
 *
 * @author SoundChain Team
 */

import SwiftUI

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

/// Manages the bridge lifecycle and state
class BridgeManager: ObservableObject {
    @Published var isRunning = false
    @Published var connectedWebClients = 0
    @Published var nearbyDevices: [NearbyDevice] = []
    @Published var recentMessages: [ChatMessage] = []
    @Published var currentGeohash: String = ""

    private var bridge: SoundChainBridge?

    struct ChatMessage: Identifiable {
        let id = UUID()
        let content: String
        let sender: String
        let timestamp: Date
        let source: MessageSource

        enum MessageSource {
            case web
            case bluetooth
        }
    }

    func start() {
        guard !isRunning else { return }

        bridge = SoundChainBridge()
        bridge?.start()
        isRunning = true

        print("🌉 BridgeManager: Started")
    }

    func stop() {
        bridge?.stop()
        bridge = nil
        isRunning = false
        nearbyDevices = []
        connectedWebClients = 0

        print("🌉 BridgeManager: Stopped")
    }

    func addMessage(_ content: String, sender: String, source: ChatMessage.MessageSource) {
        let message = ChatMessage(content: content, sender: sender, timestamp: Date(), source: source)
        DispatchQueue.main.async {
            self.recentMessages.insert(message, at: 0)
            // Keep only last 50 messages
            if self.recentMessages.count > 50 {
                self.recentMessages = Array(self.recentMessages.prefix(50))
            }
        }
    }
}
