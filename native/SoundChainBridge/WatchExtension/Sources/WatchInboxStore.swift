import Foundation
import WatchKit
import UserNotifications

// MARK: - Action Model

struct WatchPromptAction: Identifiable, Codable, Sendable, Equatable {
    var id: String
    var label: String
    var style: String?
}

// MARK: - Inbox Store

@MainActor @Observable
final class WatchInboxStore {

    // MARK: - Persisted State

    private struct PersistedState: Codable {
        var title: String
        var body: String
        var sender: String?
        var messageId: String?
        var transport: String
        var updatedAt: Date
        var lastDeliveryKey: String?
        var actions: [WatchPromptAction]?
        var replyStatusText: String?
        var replyStatusAt: Date?
    }

    // MARK: - Observable Properties

    var title = "FURL"
    var body = "Waiting for messages..."
    var sender: String?
    var messageId: String?
    var transport = "none"
    var updatedAt: Date?
    var actions: [WatchPromptAction] = []
    var replyStatusText: String?
    var replyStatusAt: Date?
    var isReplySending = false
    var messageCount = 0

    private var lastDeliveryKey: String?
    private let persistKey = "watch.inbox.state.v1"

    // MARK: - Init

    init() {
        restorePersistedState()
        ensureNotificationAuthorization()
    }

    // MARK: - Consume Incoming Message

    func consume(title: String, body: String, sender: String?, messageId: String?,
                 actions: [WatchPromptAction], transport: String) {
        // Dedup
        let key = deliveryKey(title: title, body: body, messageId: messageId)
        if key == lastDeliveryKey { return }
        lastDeliveryKey = key

        self.title = title
        self.body = body
        self.sender = sender
        self.messageId = messageId
        self.transport = transport
        self.updatedAt = Date()
        self.actions = actions
        self.replyStatusText = nil
        self.replyStatusAt = nil
        self.isReplySending = false
        self.messageCount += 1

        persistState()
        postLocalNotification(title: title, body: body)
    }

    // MARK: - Reply Helpers

    func makeReplyDraft(action: WatchPromptAction) -> WatchReplyDraft {
        WatchReplyDraft(
            replyId: UUID().uuidString,
            messageId: messageId ?? "",
            actionId: action.id,
            actionLabel: action.label,
            sentAtMs: Int(Date().timeIntervalSince1970 * 1000)
        )
    }

    func markReplySending(actionLabel: String?) {
        isReplySending = true
        replyStatusText = "Sending \(actionLabel ?? "reply")..."
        replyStatusAt = Date()
        persistState()
    }

    func markReplyResult(_ result: WatchReplySendResult, actionLabel: String?) {
        isReplySending = false
        if result.deliveredImmediately {
            replyStatusText = "\(actionLabel ?? "Reply") sent"
        } else if result.queuedForDelivery {
            replyStatusText = "\(actionLabel ?? "Reply") queued"
        } else {
            replyStatusText = "Failed: \(result.errorMessage ?? "unknown")"
        }
        replyStatusAt = Date()
        persistState()
    }

    // MARK: - Persistence

    private func persistState() {
        let state = PersistedState(
            title: title, body: body, sender: sender, messageId: messageId,
            transport: transport, updatedAt: updatedAt ?? Date(),
            lastDeliveryKey: lastDeliveryKey, actions: actions.isEmpty ? nil : actions,
            replyStatusText: replyStatusText, replyStatusAt: replyStatusAt
        )
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: persistKey)
        }
    }

    private func restorePersistedState() {
        guard let data = UserDefaults.standard.data(forKey: persistKey),
              let state = try? JSONDecoder().decode(PersistedState.self, from: data) else { return }
        title = state.title
        body = state.body
        sender = state.sender
        messageId = state.messageId
        transport = state.transport
        updatedAt = state.updatedAt
        lastDeliveryKey = state.lastDeliveryKey
        actions = state.actions ?? []
        replyStatusText = state.replyStatusText
        replyStatusAt = state.replyStatusAt
    }

    // MARK: - Dedup Key

    private func deliveryKey(title: String, body: String, messageId: String?) -> String {
        if let id = messageId, !id.isEmpty { return "id:\(id)" }
        return "content:\(title)|\(body)|\(Int(Date().timeIntervalSince1970))"
    }

    // MARK: - Local Notification + Haptic

    private func postLocalNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.threadIdentifier = "furl-watch"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.2, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)

        // Haptic buzz
        WKInterfaceDevice.current().play(.notification)
    }

    private func ensureNotificationAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }
}
