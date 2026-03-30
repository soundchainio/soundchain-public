import Foundation
import WatchConnectivity

// MARK: - Reply Types

struct WatchReplyDraft: Sendable {
    var replyId: String
    var messageId: String
    var actionId: String
    var actionLabel: String?
    var note: String?
    var sentAtMs: Int
}

struct WatchReplySendResult: Sendable, Equatable {
    var deliveredImmediately: Bool
    var queuedForDelivery: Bool
    var transport: String
    var errorMessage: String?
}

// MARK: - WatchConnectivityReceiver

final class WatchConnectivityReceiver: NSObject, @unchecked Sendable {
    private let store: WatchInboxStore
    private let session: WCSession?

    init(store: WatchInboxStore) {
        self.store = store
        self.session = WCSession.isSupported() ? WCSession.default : nil
        super.init()
    }

    func activate() {
        guard let session = self.session else { return }
        session.delegate = self
        session.activate()
    }

    // MARK: - Send Reply to iPhone

    func sendReply(_ draft: WatchReplyDraft) async -> WatchReplySendResult {
        guard let session = self.session else {
            return WatchReplySendResult(deliveredImmediately: false, queuedForDelivery: false,
                                        transport: "none", errorMessage: "WCSession not supported")
        }

        // Wait for activation
        for _ in 0..<8 {
            if session.activationState == .activated { break }
            try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        }

        let payload = buildReplyPayload(draft)

        // Try immediate delivery first
        if session.isReachable {
            return await withCheckedContinuation { continuation in
                session.sendMessage(payload, replyHandler: { _ in
                    continuation.resume(returning: WatchReplySendResult(
                        deliveredImmediately: true, queuedForDelivery: false, transport: "message"))
                }, errorHandler: { error in
                    // Fall back to transfer
                    session.transferUserInfo(payload)
                    continuation.resume(returning: WatchReplySendResult(
                        deliveredImmediately: false, queuedForDelivery: true,
                        transport: "transfer", errorMessage: error.localizedDescription))
                })
            }
        }

        // Queue for background delivery
        session.transferUserInfo(payload)
        return WatchReplySendResult(deliveredImmediately: false, queuedForDelivery: true, transport: "transfer")
    }

    private func buildReplyPayload(_ draft: WatchReplyDraft) -> [String: Any] {
        var payload: [String: Any] = [
            "type": "watch.reply",
            "replyId": draft.replyId,
            "messageId": draft.messageId,
            "actionId": draft.actionId,
            "sentAtMs": draft.sentAtMs,
        ]
        if let label = draft.actionLabel, !label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            payload["actionLabel"] = label
        }
        if let note = draft.note, !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            payload["note"] = note
        }
        return payload
    }

    // MARK: - Parse Incoming Notification

    private func parseNotification(_ raw: [String: Any]) -> (title: String, body: String, sender: String?,
                                                               messageId: String?, actions: [WatchPromptAction])? {
        guard let type = raw["type"] as? String, type == "watch.notify" else { return nil }
        guard let title = raw["title"] as? String, !title.isEmpty else { return nil }
        guard let body = raw["body"] as? String, !body.isEmpty else { return nil }

        let sender = raw["sender"] as? String
        let messageId = raw["messageId"] as? String

        var actions: [WatchPromptAction] = []
        if let rawActions = raw["actions"] as? [[String: Any]] {
            for a in rawActions {
                guard let id = a["id"] as? String, let label = a["label"] as? String else { continue }
                actions.append(WatchPromptAction(id: id, label: label, style: a["style"] as? String))
            }
        }

        return (title, body, sender, messageId, actions)
    }

    private func handleIncoming(_ payload: [String: Any], transport: String) {
        guard let parsed = parseNotification(payload) else { return }
        Task { @MainActor in
            self.store.consume(
                title: parsed.title,
                body: parsed.body,
                sender: parsed.sender,
                messageId: parsed.messageId,
                actions: parsed.actions,
                transport: transport
            )
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityReceiver: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        // Activation complete
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleIncoming(message, transport: "message")
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        handleIncoming(message, transport: "message")
        replyHandler(["ack": true])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        handleIncoming(userInfo, transport: "transfer")
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        handleIncoming(applicationContext, transport: "context")
    }
}
