/**
 * WalletRail — native-app-shaped multi-wallet aggregator for the mint flow.
 *
 * Lists every active wagmi connection (one per connector currently linked) +
 * an "ADD" pill to attach another. Each row is a compact pill — address
 * truncated, native balance + OGUN balance read direct from Polygon, switch /
 * disconnect tap targets at 32px each.
 *
 * Native-app trajectory:
 *   - wagmi v2 useConnections() exposes the canonical multi-wallet primitive.
 *     A Capacitor build with @capacitor-community/web3-provider or the Reown
 *     Capacitor adapter populates this same list — zero render-path change.
 *   - Balances read via usePublicClient (direct Polygon RPC) — no Magic relay,
 *     no rate-limit risk, no extra deps beyond wagmi + viem.
 *   - No `position: sticky` (iOS WebView momentum-scroll bug per CLAUDE.md).
 *
 * What's NOT here yet (intentional):
 *   - Wallet "activity" tab — that's a Phase 4 follow-up.
 *   - Per-wallet OGUN/NFT inventory — needs the listings index online.
 */
import { useEffect, useState } from 'react'
import {
  useConnect,
  useConnections,
  useDisconnect,
  useSwitchAccount,
  usePublicClient,
} from 'wagmi'
import { polygon } from 'wagmi/chains'
import { formatEther, formatUnits, erc20Abi } from 'viem'
import { CONTRACTS } from 'lib/contracts'

interface Balances {
  pol?: string
  ogun?: string
}

export function WalletRail() {
  const connections = useConnections()
  const { connect, connectors, isPending: connecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchAccount } = useSwitchAccount()
  const publicClient = usePublicClient({ chainId: polygon.id })

  const [balancesByAddr, setBalancesByAddr] = useState<Record<string, Balances>>({})

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    ;(async () => {
      const next: Record<string, Balances> = {}
      for (const c of connections) {
        const addr = c.accounts[0]
        if (!addr) continue
        try {
          const [pol, ogun] = await Promise.all([
            publicClient.getBalance({ address: addr }),
            publicClient
              .readContract({
                address: CONTRACTS.OGUN as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [addr],
              })
              .catch(() => 0n),
          ])
          next[addr] = {
            pol: formatEther(pol),
            ogun: formatUnits(ogun as bigint, 18),
          }
        } catch {
          next[addr] = {}
        }
      }
      if (!cancelled) setBalancesByAddr(next)
    })()
    return () => { cancelled = true }
  }, [connections, publicClient])

  const addable = connectors.filter(
    (c) => !connections.some((conn) => conn.connector.id === c.id)
  )

  if (connections.length === 0) {
    return (
      <div className="neon-panel hud-corners p-3 sm:p-4 mb-4">
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-tr" />
        <span className="hud-corner hud-corner-bl" />
        <span className="hud-corner hud-corner-br" />
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-cyan mb-1">
              WALLET RAIL · IDLE
            </div>
            <p className="text-xs text-gray-400">
              No wallets connected. Mint flow needs at least one signer on Polygon.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {connectors.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={connecting}
                onClick={() => connect({ connector: c })}
                className="btn-neon text-[10px] flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {connecting ? 'LINK…' : `◤ ${(c.name || c.id).toUpperCase()}`}
              </button>
            ))}
          </div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-gray-600 text-center">
            walletconnect → mobile wallet apps via qr / deep-link
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-cyan">
          WALLET RAIL · {connections.length} LINKED
        </div>
        {addable.length > 0 && (
          <button
            type="button"
            disabled={connecting}
            onClick={() => connect({ connector: addable[0] })}
            className="text-[9px] font-mono uppercase tracking-widest text-gray-500 hover:text-neon-cyan transition-colors px-2 py-1"
          >
            + ADD WALLET
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-1.5">
        {connections.map((c) => {
          const addr = c.accounts[0]
          const bals = balancesByAddr[addr || ''] || {}
          const onPolygon = c.chainId === polygon.id
          return (
            <div
              key={c.connector.id + addr}
              className="relative border border-white/10 bg-ink-800/60 hover:border-neon-cyan/40 transition-colors p-2.5 flex flex-col gap-1.5"
              style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${onPolygon ? 'bg-neon-mint' : 'bg-neon-amber'} animate-pulse`} />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400 truncate">
                    {c.connector.name || c.connector.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect({ connector: c.connector })}
                  className="text-[8px] font-mono uppercase tracking-widest text-gray-600 hover:text-neon-magenta px-1 py-0.5 leading-none"
                  title="Disconnect"
                >
                  ✕
                </button>
              </div>
              <div className="font-mono text-[11px] sm:text-xs text-white tabular-nums tracking-wider">
                {addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—'}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums">
                <span className="text-neon-cyan">
                  {bals.pol ? Number(bals.pol).toFixed(3) : '—'} <span className="text-gray-600">POL</span>
                </span>
                <span className="text-neon-magenta">
                  {bals.ogun ? Number(bals.ogun).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} <span className="text-gray-600">OGUN</span>
                </span>
                {!onPolygon && (
                  <span className="text-neon-amber text-[8px] uppercase tracking-widest ml-auto">
                    NOT POLYGON
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
