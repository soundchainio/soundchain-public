import SwiftUI

@main
struct SoundChainWatchApp: App {
    @State private var inboxStore = WatchInboxStore()
    @State private var traderStore = TraderWatchStore()
    @State private var receiver: WatchConnectivityReceiver?

    var body: some Scene {
        WindowGroup {
            TabView {
                // Trader tab — primary view
                TraderWatchView(store: self.traderStore)
                    .tag(0)

                // FURL Inbox tab
                WatchInboxView(store: self.inboxStore) { action in
                    guard let receiver = self.receiver else { return }
                    let draft = self.inboxStore.makeReplyDraft(action: action)
                    self.inboxStore.markReplySending(actionLabel: action.label)
                    Task { @MainActor in
                        let result = await receiver.sendReply(draft)
                        self.inboxStore.markReplyResult(result, actionLabel: action.label)
                    }
                }
                .tag(1)
            }
            .tabViewStyle(.verticalPage)
            .task {
                if self.receiver == nil {
                    let receiver = WatchConnectivityReceiver(store: self.inboxStore)
                    receiver.activate()
                    self.receiver = receiver
                }
            }
        }
    }
}
