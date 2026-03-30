import Foundation
import WatchConnectivity

/// Sends FURL DM notifications from iPhone to paired Apple Watch.
/// The Watch displays the message with haptic buzz and optional quick-reply buttons.
final class WatchMessagingService: NSObject, ObservableObject {

    static let shared = WatchMessagingService()

    @Published var isPaired = false
    @Published var isWatchAppInstalled = false
    @Published var isReachable = false

    private var session: WCSession?
    private var replyHandler: ((WatchQuickReply) -> Void)?

    // MARK: - Types

    struct WatchQuickReply {
        var replyId: String
        var messageId: String
        var actionId: String
        var actionLabel: String?
        var note: String?
    }

    struct SendResult {
        var deliveredImmediately: Bool
        var queuedForDelivery: Bool
        var transport: String
    }

    // MARK: - Init

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Public API

    /// Set a handler to receive quick replies from the Watch
    func onReply(_ handler: @escaping (WatchQuickReply) -> Void) {
        self.replyHandler = handler
    }

    /// Send a FURL DM notification to the Watch
    func sendFurlNotification(sender: String, message: String, messageId: String? = nil) async -> SendResult {
        guard let session = self.session,
              session.activationState == .activated,
              session.isPaired,
              session.isWatchAppInstalled else {
            return SendResult(deliveredImmediately: false, queuedForDelivery: false, transport: "unavailable")
        }

        var payload: [String: Any] = [
            "type": "watch.notify",
            "title": "FURL",
            "body": message,
            "sender": sender,
            "sentAtMs": Int(Date().timeIntervalSince1970 * 1000),
            "actions": [
                ["id": "reply_fire", "label": "Reply"],
                ["id": "dismiss", "label": "Dismiss", "style": "cancel"],
            ] as [[String: Any]],
        ]

        if let id = messageId {
            payload["messageId"] = id
        }

        // Try immediate delivery
        if session.isReachable {
            return await withCheckedContinuation { continuation in
                session.sendMessage(payload, replyHandler: { _ in
                    continuation.resume(returning: SendResult(
                        deliveredImmediately: true, queuedForDelivery: false, transport: "message"))
                }, errorHandler: { _ in
                    session.transferUserInfo(payload)
                    continuation.resume(returning: SendResult(
                        deliveredImmediately: false, queuedForDelivery: true, transport: "transfer"))
                })
            }
        }

        // Queue for background
        session.transferUserInfo(payload)
        return SendResult(deliveredImmediately: false, queuedForDelivery: true, transport: "transfer")
    }

    // MARK: - Parse Reply

    private func parseReply(_ payload: [String: Any]) -> WatchQuickReply? {
        guard let type = payload["type"] as? String, type == "watch.reply",
              let actionId = payload["actionId"] as? String, !actionId.isEmpty else { return nil }
        return WatchQuickReply(
            replyId: payload["replyId"] as? String ?? "",
            messageId: payload["messageId"] as? String ?? "",
            actionId: actionId,
            actionLabel: payload["actionLabel"] as? String,
            note: payload["note"] as? String
        )
    }
}

// MARK: - WCSessionDelegate

extension WatchMessagingService: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        DispatchQueue.main.async {
            self.isPaired = session.isPaired
            self.isWatchAppInstalled = session.isWatchAppInstalled
            self.isReachable = session.isReachable
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if let reply = parseReply(message) { replyHandler?(reply) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        if let reply = parseReply(message) { self.replyHandler?(reply) }
        replyHandler(["ack": true])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        if let reply = parseReply(userInfo) { replyHandler?(reply) }
    }
}
