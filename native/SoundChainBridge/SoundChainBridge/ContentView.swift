/**
 * SoundChain Bridge - Main UI
 *
 * SwiftUI interface showing:
 * - Bridge connection status (Nostr + Bluetooth)
 * - Nearby Bluetooth devices
 * - Recent chat messages bridged
 * - Location for geohash
 */

import SwiftUI
import CoreLocation

struct ContentView: View {
    @EnvironmentObject var bridgeManager: BridgeManager
    @State private var messageText: String = ""
    @FocusState private var isMessageFieldFocused: Bool

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 20) {
                        // Header Card
                        headerCard

                        // Location Card (NEW - for geohash)
                        locationCard

                        // Status Card
                        statusCard

                        // Send Message Card (NEW)
                        if bridgeManager.isRunning {
                            sendMessageCard
                        }

                        // Nearby Devices
                        nearbyDevicesCard

                        // Recent Messages
                        recentMessagesCard

                        // Instructions
                        instructionsCard
                    }
                    .padding()
                }
            }
            .background(
                LinearGradient(
                    colors: [Color.black, Color(red: 0.1, green: 0.05, blue: 0.15)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .navigationBarHidden(true)
        }
        .preferredColorScheme(.dark)
        .onAppear {
            bridgeManager.requestLocation()
        }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        VStack(spacing: 12) {
            // Logo
            HStack(spacing: 12) {
                Image(systemName: "waveform.circle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.orange, .yellow, .cyan],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text("SoundChain")
                        .font(.title.bold())
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.orange, .yellow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    Text("Bridge")
                        .font(.title2)
                        .foregroundColor(.cyan)
                }
            }

            Text("Nostr ↔ Bluetooth Mesh")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }

    // MARK: - Location Card

    private var locationCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "location.fill")
                    .foregroundColor(.green)
                Text("Your Location")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()

                if bridgeManager.isLocating {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }

            if let geohash = bridgeManager.currentGeohash {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Geohash: \(geohash)")
                            .font(.system(.body, design: .monospaced))
                            .foregroundColor(.cyan)

                        if let name = bridgeManager.locationName {
                            Text(name)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    Spacer()

                    Button(action: {
                        bridgeManager.requestLocation()
                    }) {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.cyan)
                    }
                }
            } else {
                HStack {
                    Text(bridgeManager.locationError ?? "Detecting location...")
                        .font(.caption)
                        .foregroundColor(bridgeManager.locationError != nil ? .red : .gray)
                    Spacer()

                    Button(action: {
                        bridgeManager.requestLocation()
                    }) {
                        Text("Retry")
                            .font(.caption)
                            .foregroundColor(.cyan)
                    }
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.green.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: bridgeManager.isRunning ? "antenna.radiowaves.left.and.right" : "antenna.radiowaves.left.and.right.slash")
                    .font(.title2)
                    .foregroundColor(bridgeManager.isRunning ? .green : .gray)

                VStack(alignment: .leading) {
                    Text(bridgeManager.isRunning ? "Bridge Active" : "Bridge Stopped")
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(bridgeManager.isRunning ? "Bridging Nostr ↔ Bluetooth" : "Tap Start to begin")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                // Status indicator
                Circle()
                    .fill(bridgeManager.isRunning ? Color.green : Color.gray)
                    .frame(width: 12, height: 12)
            }

            // Stats Row
            HStack(spacing: 20) {
                StatBadge(
                    icon: "globe",
                    value: bridgeManager.nostrConnected ? "✓" : "-",
                    label: "Nostr",
                    color: bridgeManager.nostrConnected ? .cyan : .gray
                )

                StatBadge(
                    icon: "dot.radiowaves.left.and.right",
                    value: "\(bridgeManager.nearbyDevices.count)",
                    label: "Bluetooth",
                    color: .purple
                )

                StatBadge(
                    icon: "arrow.left.arrow.right",
                    value: "\(bridgeManager.messagesRelayed)",
                    label: "Relayed",
                    color: .orange
                )
            }

            // Start/Stop Button
            Button(action: {
                if bridgeManager.isRunning {
                    bridgeManager.stop()
                } else {
                    bridgeManager.start()
                }
            }) {
                HStack {
                    Image(systemName: bridgeManager.isRunning ? "stop.fill" : "play.fill")
                    Text(bridgeManager.isRunning ? "Stop Bridge" : "Start Bridge")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: bridgeManager.isRunning ? [.red, .orange] : [.cyan, .blue],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(bridgeManager.currentGeohash == nil)
            .opacity(bridgeManager.currentGeohash == nil ? 0.5 : 1)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(bridgeManager.isRunning ? Color.green.opacity(0.3) : Color.gray.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Nearby Devices Card

    private var nearbyDevicesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "dot.radiowaves.left.and.right")
                    .foregroundColor(.purple)
                Text("Nearby Devices")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
                Text("\(bridgeManager.nearbyDevices.count)")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.purple.opacity(0.2))
                    .foregroundColor(.purple)
                    .cornerRadius(8)
            }

            if bridgeManager.nearbyDevices.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "antenna.radiowaves.left.and.right.slash")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                        Text("No devices found")
                            .font(.caption)
                            .foregroundColor(.gray)
                        Text("Nearby Bitchat users will appear here")
                            .font(.caption2)
                            .foregroundColor(.gray.opacity(0.7))
                    }
                    .padding(.vertical, 20)
                    Spacer()
                }
            } else {
                ForEach(bridgeManager.nearbyDevices, id: \.id) { device in
                    DeviceRow(device: device)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.purple.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Recent Messages Card

    private var recentMessagesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "message.fill")
                    .foregroundColor(.orange)
                Text("Messages Bridged")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
            }

            if bridgeManager.recentMessages.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                        Text("No messages yet")
                            .font(.caption)
                            .foregroundColor(.gray)
                        Text("Messages from Nostr & Bluetooth appear here")
                            .font(.caption2)
                            .foregroundColor(.gray.opacity(0.7))
                    }
                    .padding(.vertical, 20)
                    Spacer()
                }
            } else {
                ForEach(bridgeManager.recentMessages.prefix(5)) { message in
                    MessageRow(message: message)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.orange.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Send Message Card

    private var sendMessageCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "paperplane.fill")
                    .foregroundColor(.green)
                Text("Send Message")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
            }

            HStack(spacing: 8) {
                TextField("Type a message...", text: $messageText)
                    .textFieldStyle(PlainTextFieldStyle())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(20)
                    .foregroundColor(.white)
                    .focused($isMessageFieldFocused)
                    .submitLabel(.send)
                    .onSubmit {
                        sendMessage()
                    }

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(
                            LinearGradient(
                                colors: messageText.isEmpty ? [.gray] : [.green, .cyan],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
                .disabled(messageText.isEmpty)
            }

            Text("Messages sent here go to Nostr relays & nearby Bluetooth devices")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.green.opacity(0.2), lineWidth: 1)
        )
    }

    private func sendMessage() {
        guard !messageText.isEmpty else { return }
        bridgeManager.sendMessage(messageText)
        messageText = ""
        isMessageFieldFocused = false
    }

    // MARK: - Instructions Card

    private var instructionsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.cyan)
                Text("How It Works")
                    .font(.headline)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 8) {
                InstructionRow(number: 1, text: "Allow location access for geohash")
                InstructionRow(number: 2, text: "Start the bridge (tap button above)")
                InstructionRow(number: 3, text: "Bridge connects to Nostr + Bluetooth")
                InstructionRow(number: 4, text: "Messages auto-relay between networks!")
            }

            Divider()
                .background(Color.gray.opacity(0.3))

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "globe")
                        .foregroundColor(.cyan)
                        .font(.caption)
                    Text("SoundChain web → Nostr → Bridge → Bluetooth → Bitchat")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
                HStack {
                    Image(systemName: "dot.radiowaves.left.and.right")
                        .foregroundColor(.purple)
                        .font(.caption)
                    Text("Bitchat → Bluetooth → Bridge → Nostr → SoundChain web")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }

            Divider()
                .background(Color.gray.opacity(0.3))

            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.yellow)
                    .font(.caption)
                Text("Keep this app open for bridge to work")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.cyan.opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Supporting Views

struct StatBadge: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                Text(value)
                    .font(.headline.bold())
            }
            .foregroundColor(color)

            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct DeviceRow: View {
    let device: NearbyDevice

    var body: some View {
        HStack(spacing: 12) {
            // Device icon
            ZStack {
                Circle()
                    .fill(device.isBitchat ? Color.green.opacity(0.2) : Color.blue.opacity(0.2))
                    .frame(width: 40, height: 40)

                Image(systemName: device.isBitchat ? "bubble.left.and.bubble.right.fill" : "iphone")
                    .foregroundColor(device.isBitchat ? .green : .blue)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(device.name)
                    .font(.subheadline)
                    .foregroundColor(.white)

                HStack(spacing: 4) {
                    if device.isBitchat {
                        Text("Bitchat")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green.opacity(0.2))
                            .foregroundColor(.green)
                            .cornerRadius(4)
                    }

                    Text("RSSI: \(device.rssi)")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }

            Spacer()

            // Signal strength indicator
            SignalStrength(rssi: device.rssi)
        }
        .padding(.vertical, 4)
    }
}

struct SignalStrength: View {
    let rssi: Int

    var bars: Int {
        if rssi > -50 { return 4 }
        if rssi > -60 { return 3 }
        if rssi > -70 { return 2 }
        return 1
    }

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<4, id: \.self) { index in
                RoundedRectangle(cornerRadius: 1)
                    .fill(index < bars ? Color.green : Color.gray.opacity(0.3))
                    .frame(width: 4, height: CGFloat(8 + index * 4))
            }
        }
    }
}

struct MessageRow: View {
    let message: BridgeManager.ChatMessage

    // Extract URL from content if present
    private var extractedURL: URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: message.content, options: [], range: NSRange(location: 0, length: message.content.utf16.count))
        if let match = matches?.first, let range = Range(match.range, in: message.content) {
            return URL(string: String(message.content[range]))
        }
        return nil
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Source indicator with direction
            VStack(spacing: 2) {
                Image(systemName: message.source == .nostr ? "globe" : "dot.radiowaves.left.and.right")
                    .font(.caption)
                    .foregroundColor(message.source == .nostr ? .cyan : .purple)
                Image(systemName: "arrow.right")
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
                Image(systemName: message.source == .nostr ? "dot.radiowaves.left.and.right" : "globe")
                    .font(.caption)
                    .foregroundColor(message.source == .nostr ? .purple : .cyan)
            }
            .frame(width: 20)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(message.sender.prefix(8) + "...")
                        .font(.caption)
                        .foregroundColor(.gray)

                    Spacer()

                    Text(message.timestamp, style: .time)
                        .font(.caption2)
                        .foregroundColor(.gray.opacity(0.7))
                }

                // Content with tappable links
                if let url = extractedURL {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(message.content)
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .lineLimit(2)

                        // Tappable link button
                        Link(destination: url) {
                            HStack(spacing: 4) {
                                Image(systemName: "link")
                                    .font(.caption)
                                Text("Open Link")
                                    .font(.caption)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.cyan.opacity(0.2))
                            .foregroundColor(.cyan)
                            .cornerRadius(6)
                        }
                    }
                } else {
                    Text(message.content)
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .lineLimit(2)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct InstructionRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption.bold())
                .foregroundColor(.black)
                .frame(width: 20, height: 20)
                .background(
                    LinearGradient(
                        colors: [.cyan, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(10)

            Text(text)
                .font(.subheadline)
                .foregroundColor(.gray)
        }
    }
}

// MARK: - Preview

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(BridgeManager())
    }
}
