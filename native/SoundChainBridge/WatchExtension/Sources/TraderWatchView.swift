import SwiftUI
import WatchKit

// MARK: - Trader Status Model

struct TraderStatusResponse: Codable {
    var portfolio: Double?
    var cash: Double?
    var solQty: Double?
    var solPrice: Double?
    var entryPrice: Double?
    var pnlTotal: Double?
    var pnlPct: Double?
    var rsi1m: Double?
    var rsi1h: Double?
    var holding: Bool?
    var todayProfit: Double?
    var dailyTarget: Double?
    var dailyPct: Double?
    var bonusRound: Bool?
    var lastAction: String?
    var winRate: Double?
    var totalPnl: Double?
    var age: Int?
}

// MARK: - Trader Store

@MainActor @Observable
final class TraderWatchStore {
    var status: TraderStatusResponse?
    var lastFetch: Date?
    var error: String?
    var tradeLoading: String? // "BUY" or "SELL"
    var tradeResult: String?

    private let baseURL = "https://soundchain.io"
    private let token = "ogun-razor-v12"
    private var timer: Timer?

    func startPolling() {
        fetchStatus()
        timer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.fetchStatus()
            }
        }
    }

    func stopPolling() {
        timer?.invalidate()
        timer = nil
    }

    func fetchStatus() {
        Task {
            do {
                guard let url = URL(string: "\(baseURL)/api/trader/update?token=\(token)") else { return }
                let (data, response) = try await URLSession.shared.data(from: url)
                guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                    self.error = "Bot offline"
                    return
                }
                let decoded = try JSONDecoder().decode(TraderStatusResponse.self, from: data)
                self.status = decoded
                self.lastFetch = Date()
                self.error = nil
            } catch {
                self.error = "No signal"
            }
        }
    }

    func executeTrade(action: String) {
        tradeLoading = action
        tradeResult = nil

        Task {
            do {
                guard let url = URL(string: "\(baseURL)/api/trader/trade?token=\(token)") else { return }
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try JSONEncoder().encode(["action": action])

                let (data, response) = try await URLSession.shared.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                    self.tradeResult = "\(action) FAILED"
                    self.tradeLoading = nil
                    WKInterfaceDevice.current().play(.failure)
                    return
                }

                self.tradeResult = "\(action) SENT"
                self.tradeLoading = nil
                WKInterfaceDevice.current().play(.success)

                // Clear result after 3s
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                self.tradeResult = nil
            } catch {
                self.tradeResult = "\(action) FAILED"
                self.tradeLoading = nil
                WKInterfaceDevice.current().play(.failure)
            }
        }
    }
}

// MARK: - Trader Watch View

struct TraderWatchView: View {
    @Bindable var store: TraderWatchStore

    private var isUp: Bool {
        (store.status?.pnlTotal ?? 0) >= 0
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 6) {
                // Header
                HStack(spacing: 4) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(.cyan)
                        .font(.caption2)
                    Text("OGUN TRADER")
                        .font(.caption2)
                        .foregroundStyle(.cyan)
                        .fontWeight(.black)
                    Spacer()
                    if let age = store.status?.age {
                        Circle()
                            .fill(age < 30 ? .green : .yellow)
                            .frame(width: 6, height: 6)
                    }
                }

                if let error = store.error {
                    Text(error)
                        .font(.caption2)
                        .foregroundStyle(.red)
                }

                if let s = store.status {
                    // SOL Price — big
                    HStack(alignment: .firstTextBaseline) {
                        Text("$\(s.solPrice ?? 0, specifier: "%.2f")")
                            .font(.title2)
                            .fontWeight(.black)
                            .foregroundStyle(.white)
                        Text("SOL")
                            .font(.caption2)
                            .foregroundStyle(.gray)
                    }

                    // Portfolio
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Portfolio")
                                .font(.system(size: 9))
                                .foregroundStyle(.gray)
                            Text("$\(s.portfolio ?? 0, specifier: "%.0f")")
                                .font(.caption)
                                .fontWeight(.bold)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 1) {
                            Text("P&L")
                                .font(.system(size: 9))
                                .foregroundStyle(.gray)
                            Text("\(isUp ? "+" : "")$\(s.pnlTotal ?? 0, specifier: "%.2f")")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(isUp ? .green : .red)
                        }
                    }

                    // Position or Waiting
                    if s.holding == true {
                        HStack {
                            Text("\(s.solQty ?? 0, specifier: "%.1f") SOL")
                                .font(.caption2)
                                .fontWeight(.bold)
                            Text("@ $\(s.entryPrice ?? 0, specifier: "%.2f")")
                                .font(.caption2)
                                .foregroundStyle(.gray)
                            Spacer()
                            Text("\(isUp ? "+" : "")\(s.pnlPct ?? 0, specifier: "%.1f")%")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(isUp ? .green : .red)
                        }
                        .padding(6)
                        .background((isUp ? Color.green : Color.red).opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    } else {
                        HStack {
                            Image(systemName: "bolt.fill")
                                .foregroundStyle(.cyan)
                                .font(.caption2)
                            Text("Waiting for entry")
                                .font(.caption2)
                                .foregroundStyle(.cyan)
                        }
                        .padding(6)
                        .frame(maxWidth: .infinity)
                        .background(Color.cyan.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    }

                    // RSI
                    HStack(spacing: 8) {
                        VStack(spacing: 1) {
                            Text("1m RSI")
                                .font(.system(size: 8))
                                .foregroundStyle(.gray)
                            Text("\(Int(s.rsi1m ?? 0))")
                                .font(.caption)
                                .fontWeight(.black)
                                .foregroundStyle(rsiColor(s.rsi1m ?? 50))
                        }
                        VStack(spacing: 1) {
                            Text("1h RSI")
                                .font(.system(size: 8))
                                .foregroundStyle(.gray)
                            Text("\(Int(s.rsi1h ?? 0))")
                                .font(.caption)
                                .fontWeight(.black)
                                .foregroundStyle(rsiColor(s.rsi1h ?? 50))
                        }
                        Spacer()
                        VStack(spacing: 1) {
                            Text("Win")
                                .font(.system(size: 8))
                                .foregroundStyle(.gray)
                            Text("\(Int(s.winRate ?? 0))%")
                                .font(.caption)
                                .fontWeight(.black)
                                .foregroundStyle(.green)
                        }
                    }

                    // Daily target
                    if let todayProfit = s.todayProfit, let target = s.dailyTarget {
                        VStack(spacing: 2) {
                            HStack {
                                Text("Daily")
                                    .font(.system(size: 8))
                                    .foregroundStyle(.gray)
                                Spacer()
                                Text("$\(todayProfit, specifier: "%.2f") / $\(target, specifier: "%.0f")")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundStyle(s.bonusRound == true ? .green : .white)
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color.white.opacity(0.1))
                                        .frame(height: 4)
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(s.bonusRound == true ? Color.green : Color.amber)
                                        .frame(width: geo.size.width * min(1, CGFloat(s.dailyPct ?? 0) / 100), height: 4)
                                }
                            }
                            .frame(height: 4)
                        }
                    }

                    Divider().padding(.vertical, 2)

                    // BUY / SELL Buttons
                    HStack(spacing: 6) {
                        Button {
                            store.executeTrade(action: "BUY")
                        } label: {
                            HStack(spacing: 3) {
                                Image(systemName: "arrow.up.circle.fill")
                                    .font(.caption2)
                                Text(store.tradeLoading == "BUY" ? "..." : "BUY")
                                    .font(.caption2)
                                    .fontWeight(.black)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green.opacity(0.8))
                        .disabled(store.tradeLoading != nil)

                        Button {
                            store.executeTrade(action: "SELL")
                        } label: {
                            HStack(spacing: 3) {
                                Image(systemName: "arrow.down.circle.fill")
                                    .font(.caption2)
                                Text(store.tradeLoading == "SELL" ? "..." : "SELL")
                                    .font(.caption2)
                                    .fontWeight(.black)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red.opacity(0.8))
                        .disabled(store.tradeLoading != nil)
                    }

                    // Trade result
                    if let result = store.tradeResult {
                        Text(result)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(result.contains("SENT") ? .green : .red)
                            .frame(maxWidth: .infinity)
                    }

                    // Last action
                    if let action = s.lastAction, !action.isEmpty {
                        Text(action)
                            .font(.system(size: 9))
                            .foregroundStyle(.purple)
                            .lineLimit(2)
                    }
                }

                if store.status == nil && store.error == nil {
                    Text("Loading...")
                        .font(.caption)
                        .foregroundStyle(.gray)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 4)
        }
        .background(Color.black)
        .onAppear { store.startPolling() }
        .onDisappear { store.stopPolling() }
    }

    private func rsiColor(_ rsi: Double) -> Color {
        if rsi <= 30 { return .green }
        if rsi >= 70 { return .red }
        return .white
    }
}

// Custom amber color
extension Color {
    static let amber = Color(red: 245/255, green: 158/255, blue: 11/255)
}

#Preview {
    let store = TraderWatchStore()
    TraderWatchView(store: store)
}
