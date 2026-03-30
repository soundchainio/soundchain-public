import SwiftUI

struct WatchInboxView: View {
    @Bindable var store: WatchInboxStore
    var onAction: ((WatchPromptAction) -> Void)?

    private func role(for action: WatchPromptAction) -> ButtonRole? {
        switch action.style?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "destructive": return .destructive
        case "cancel": return .cancel
        default: return nil
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack(spacing: 6) {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                        .foregroundStyle(.cyan)
                        .font(.caption)
                    Text("FURL")
                        .font(.caption2)
                        .foregroundStyle(.cyan)
                        .fontWeight(.bold)
                    Spacer()
                    if store.messageCount > 0 {
                        Text("\(store.messageCount)")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.cyan.opacity(0.2))
                            .clipShape(Capsule())
                            .foregroundStyle(.cyan)
                    }
                }

                // Sender
                if let sender = store.sender, !sender.isEmpty {
                    Text(sender)
                        .font(.headline)
                        .lineLimit(1)
                        .foregroundStyle(.white)
                }

                // Message body
                Text(store.body)
                    .font(.body)
                    .fixedSize(horizontal: false, vertical: true)
                    .foregroundStyle(.white.opacity(0.9))

                // Action buttons
                if !store.actions.isEmpty {
                    Divider().padding(.vertical, 4)
                    ForEach(store.actions) { action in
                        Button(role: self.role(for: action)) {
                            self.onAction?(action)
                        } label: {
                            Text(action.label)
                                .frame(maxWidth: .infinity)
                        }
                        .disabled(store.isReplySending)
                        .tint(.cyan)
                    }
                }

                // Reply status
                if let status = store.replyStatusText, !status.isEmpty {
                    Text(status)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                // Timestamp
                if let updatedAt = store.updatedAt {
                    Text("Updated \(updatedAt.formatted(date: .omitted, time: .shortened))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .background(Color.black)
    }
}

#Preview {
    let store = WatchInboxStore()
    WatchInboxView(store: store)
}
