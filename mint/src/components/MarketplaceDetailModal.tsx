/**
 * MarketplaceDetailModal — overlay modal for marketplace cards.
 *
 * Same dual-source resolution as `/marketplace/[id]` (active listing →
 * browse-mode fallback), rendered as an overlay on top of the grid so the
 * user never leaves the marketplace page. The `[id].tsx` page stays in
 * place for direct URL navigation (shareable links).
 *
 * Audio state is owned by the grid parent and threaded through here so the
 * single shared `<audio>` element keeps playing across grid ↔ modal.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { formatEther } from 'viem'
import { CONTRACTS, MARKETPLACE_ABI, ERC20_ABI, PaymentType, PLATFORM_FEE_DECIMAL } from 'lib/contracts'
import { WalletRail } from 'components/WalletRail'

const SC_BASE = 'https://soundchain.io'
const POLYGONSCAN_TX = (hash: string) => `https://polygonscan.com/tx/${hash}`

type BuyStep = 'idle' | 'approving' | 'waiting-approval' | 'buying' | 'waiting-buy' | 'success' | 'error'

interface Listing {
  tokenId: string
  owner: string
  pricesWei: string[]
  acceptedPayments: number
  metadata?: {
    title?: string
    artist?: string
    coverArtUrl?: string
    audioUrl?: string
  }
}

interface BrowseTrack {
  id: string
  title?: string
  artist?: string
  artworkUrl?: string
  playbackUrl?: string
  assetUrl?: string
  editionSize?: number
  nftData?: { tokenId?: string | number }
}

type Resolved =
  | { kind: 'listing'; data: Listing }
  | { kind: 'browse'; data: BrowseTrack }
  | { kind: 'missing' }

interface Props {
  id: string
  onClose: () => void
  isPlaying: boolean
  onTogglePlay: (id: string, audioUrl?: string) => void
}

export function MarketplaceDetailModal({ id, onClose, isPlaying, onTogglePlay }: Props) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: polygon.id })
  const { data: walletClient } = useWalletClient({ chainId: polygon.id })

  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.POL)
  const [step, setStep] = useState<BuyStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [approveTx, setApproveTx] = useState<string | null>(null)
  const [buyTx, setBuyTx] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const listingRes = await fetch(`/api/marketplace/listing/${id}`)
        if (listingRes.ok) {
          const data = await listingRes.json()
          if (data?.listing && !cancelled) {
            setResolved({ kind: 'listing', data: data.listing })
            return
          }
        }
        const trackRes = await fetch(`/api/tracks/list?trackId=${id}`)
        if (trackRes.ok) {
          const data = await trackRes.json()
          if (data?.track && !cancelled) {
            setResolved({ kind: 'browse', data: data.track })
            return
          }
        }
        if (!cancelled) setResolved({ kind: 'missing' })
      } catch {
        if (!cancelled) setResolved({ kind: 'missing' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  // Escape key + lock body scroll while modal is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const title = resolved?.kind === 'listing'
    ? (resolved.data.metadata?.title || `Token #${resolved.data.tokenId}`)
    : resolved?.kind === 'browse'
    ? (resolved.data.title || `Track #${resolved.data.id.slice(-6)}`)
    : ''
  const artist = resolved?.kind === 'listing'
    ? resolved.data.metadata?.artist
    : resolved?.kind === 'browse'
    ? resolved.data.artist
    : undefined
  const coverArtUrl = resolved?.kind === 'listing'
    ? resolved.data.metadata?.coverArtUrl
    : resolved?.kind === 'browse'
    ? resolved.data.artworkUrl
    : undefined
  const audioUrl = resolved?.kind === 'listing'
    ? resolved.data.metadata?.audioUrl
    : resolved?.kind === 'browse'
    ? (resolved.data.playbackUrl || resolved.data.assetUrl)
    : undefined
  const tokenIdDisplay = resolved?.kind === 'listing'
    ? resolved.data.tokenId
    : resolved?.kind === 'browse'
    ? String(resolved.data.nftData?.tokenId ?? '?')
    : '?'

  const onPolygon = chainId === polygon.id

  const acceptedPaymentList = resolved?.kind === 'listing'
    ? Object.values(PaymentType)
        .filter((v) => typeof v === 'number')
        .map((v) => v as PaymentType)
        .filter((pt) => (resolved.data.acceptedPayments & (1 << pt)) !== 0)
    : []

  const priceBigInt = resolved?.kind === 'listing'
    ? BigInt(resolved.data.pricesWei[paymentType] || '0')
    : 0n

  async function handleBuy() {
    setError(null)
    if (resolved?.kind !== 'listing') return
    const listing = resolved.data
    if (!isConnected || !walletClient || !publicClient || !address) {
      setError('Connect a wallet in the rail above first.')
      return
    }
    if (!onPolygon) {
      try {
        await switchChain({ chainId: polygon.id })
      } catch {
        setError('Please switch the active wallet to Polygon mainnet.')
        return
      }
    }

    try {
      const isNative = paymentType === PaymentType.POL
      if (!isNative) {
        const tokenAddress = tokenAddressFor(paymentType)
        if (!tokenAddress) {
          setError('Unsupported payment token (not yet wired in @soundchain/contracts).')
          return
        }
        const allowance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, CONTRACTS.MARKETPLACE_EDITIONS as `0x${string}`],
        }) as bigint

        if (allowance < priceBigInt) {
          setStep('approving')
          const approveHash = await walletClient.writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.MARKETPLACE_EDITIONS as `0x${string}`, priceBigInt],
          })
          setApproveTx(approveHash)
          setStep('waiting-approval')
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      setStep('buying')
      const buyHash = await walletClient.writeContract({
        address: CONTRACTS.MARKETPLACE_EDITIONS as `0x${string}`,
        abi: MARKETPLACE_ABI,
        functionName: 'buyItem',
        args: [
          CONTRACTS.NFT_EDITIONS as `0x${string}`,
          BigInt(listing.tokenId),
          listing.owner as `0x${string}`,
          paymentType,
        ],
        value: isNative ? priceBigInt : 0n,
      })
      setBuyTx(buyHash)

      setStep('waiting-buy')
      await publicClient.waitForTransactionReceipt({ hash: buyHash })

      try {
        await fetch(`${SC_BASE}/api/marketplace/notify-buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId: listing.tokenId, buyer: address, buyTx: buyHash }),
        })
      } catch {
        // non-fatal
      }

      setStep('success')
    } catch (err: any) {
      setStep('error')
      setError(err?.shortMessage || err?.message || 'Buy failed.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto bg-ink-900 border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.15)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-5 py-2.5 border-b border-white/5 backdrop-blur-md bg-ink-900/85">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-sm bg-neon-cyan shadow-neon-cyan flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] text-gray-400 truncate">
              LISTING.{(id || '').slice(-6).toUpperCase() || '······'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-sm text-neon-cyan border border-neon-cyan/40 bg-ink-900/85 hover:bg-neon-cyan hover:text-black transition-colors"
            style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)' }}
          >
            ✕
          </button>
        </div>

        <section className="px-3 sm:px-5 py-4 sm:py-5">
          {loading && (
            <div className="neon-panel hud-corners p-6 animate-pulse">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neon-cyan/60">
                ◌ LOADING ASSET…
              </div>
            </div>
          )}

          {!loading && resolved?.kind === 'missing' && (
            <div className="neon-panel neon-panel-magenta hud-corners p-5 text-center">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-neon-magenta mb-2">
                ◤ ASSET NOT FOUND
              </div>
              <p className="text-xs text-gray-400 mb-3">No listing or track resolved for ID {id}.</p>
              <button type="button" onClick={onClose} className="btn-neon text-[10px]">
                ◤ BACK TO MARKET
              </button>
            </div>
          )}

          {!loading && resolved && resolved.kind !== 'missing' && (
            <div className="space-y-4">
              {/* Hero — cover art + title + audio toggle */}
              <div className="neon-panel hud-corners p-3 sm:p-4 grid grid-cols-3 gap-3 sm:gap-4 items-start">
                <span className="hud-corner hud-corner-tl" />
                <span className="hud-corner hud-corner-tr" />
                <span className="hud-corner hud-corner-bl" />
                <span className="hud-corner hud-corner-br" />

                <div className="relative col-span-1 aspect-square overflow-hidden bg-ink-700 group">
                  {coverArtUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverArtUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-gray-600">
                      NO ASSET
                    </div>
                  )}
                  <div className="absolute top-1 left-1 px-1 py-[1px] bg-ink-900/90 text-[8px] font-mono tracking-wide text-neon-cyan/90 leading-none">
                    #{tokenIdDisplay}
                  </div>
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePlay(id, audioUrl)
                      }}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className={`absolute bottom-1 right-1 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold border transition-all ${
                        isPlaying
                          ? 'bg-neon-cyan text-black border-neon-cyan shadow-neon-cyan'
                          : 'bg-ink-900/85 text-neon-cyan border-neon-cyan/60 hover:bg-neon-cyan hover:text-black'
                      }`}
                      style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)' }}
                    >
                      {isPlaying ? '❚❚' : '▶'}
                    </button>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 border-2 border-neon-cyan animate-pulse pointer-events-none" />
                  )}
                </div>

                <div className="col-span-2 min-w-0">
                  <div className="inline-block text-[8px] font-mono uppercase tracking-[0.3em] px-1.5 py-0.5 border border-neon-mint/40 text-neon-mint mb-2">
                    {resolved.kind === 'listing' ? 'ACTIVE LISTING · 137' : 'BROWSE · POLYGON 137'}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none text-white truncate">
                    {title}
                  </h1>
                  {artist && (
                    <div className="text-xs sm:text-sm font-mono text-gray-400 truncate mt-1.5">
                      <span className="text-gray-600 uppercase tracking-widest text-[9px]">by </span>
                      <span className="text-neon-magenta">{artist}</span>
                    </div>
                  )}
                  {resolved.kind === 'browse' && resolved.data.editionSize && (
                    <div className="text-[10px] font-mono text-neon-cyan mt-2">
                      EDITION OF {resolved.data.editionSize}
                    </div>
                  )}
                </div>
              </div>

              {/* LISTING PATH — buy flow */}
              {resolved.kind === 'listing' && (
                <>
                  <WalletRail />

                  <div className="neon-panel hud-corners p-4 sm:p-5 space-y-4">
                    <span className="hud-corner hud-corner-tl" />
                    <span className="hud-corner hud-corner-tr" />
                    <span className="hud-corner hud-corner-bl" />
                    <span className="hud-corner hud-corner-br" />

                    <div>
                      <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-cyan mb-2">
                        PAY WITH
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {acceptedPaymentList.length === 0 && (
                          <div className="text-[10px] font-mono text-gray-500">— no payment options —</div>
                        )}
                        {acceptedPaymentList.map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setPaymentType(pt)}
                            className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                              paymentType === pt
                                ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/60'
                                : 'border-white/10 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40'
                            }`}
                            style={{ clipPath: 'polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px)' }}
                          >
                            {PaymentType[pt]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                      <div className="border-l-2 border-neon-cyan/50 pl-2">
                        <div className="uppercase tracking-[0.25em] text-gray-500">PRICE</div>
                        <div className="text-neon-cyan tabular-nums truncate">
                          {paymentType === PaymentType.POL
                            ? `${formatEther(priceBigInt)} POL`
                            : `${priceBigInt.toString()}`}
                        </div>
                      </div>
                      <div className="border-l-2 border-neon-mint/50 pl-2">
                        <div className="uppercase tracking-[0.25em] text-gray-500">FEE</div>
                        <div className="text-neon-mint">{(PLATFORM_FEE_DECIMAL * 100).toFixed(2)}%</div>
                      </div>
                      <div className="border-l-2 border-neon-magenta/50 pl-2">
                        <div className="uppercase tracking-[0.25em] text-gray-500">CHAIN</div>
                        <div className="text-neon-magenta">137</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBuy}
                      disabled={!isConnected || (step !== 'idle' && step !== 'error')}
                      className="btn-neon w-full text-xs"
                    >
                      {!isConnected
                        ? '◌ CONNECT WALLET TO BUY'
                        : step === 'idle' || step === 'error'
                        ? `◤ BUY WITH ${PaymentType[paymentType]}`
                        : labelForBuy(step)}
                    </button>

                    {(approveTx || buyTx) && (
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        {approveTx && (
                          <a
                            href={POLYGONSCAN_TX(approveTx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[10px] text-neon-cyan hover:text-white font-mono break-all transition-colors"
                          >
                            <span className="text-gray-600 uppercase tracking-widest">APPROVE → </span>
                            {approveTx.slice(0, 10)}…{approveTx.slice(-8)}
                          </a>
                        )}
                        {buyTx && (
                          <a
                            href={POLYGONSCAN_TX(buyTx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[10px] text-neon-magenta hover:text-white font-mono break-all transition-colors"
                          >
                            <span className="text-gray-600 uppercase tracking-widest">BUY → </span>
                            {buyTx.slice(0, 10)}…{buyTx.slice(-8)}
                          </a>
                        )}
                      </div>
                    )}

                    {error && (
                      <div className="border border-neon-magenta/40 bg-neon-magenta/10 p-3 text-xs text-neon-magenta/90 font-mono">
                        <div className="uppercase tracking-[0.3em] text-[9px] mb-1">◤ ERR</div>
                        {error}
                      </div>
                    )}

                    {step === 'success' && address && (
                      <div className="border border-neon-mint/40 bg-neon-mint/10 p-3 text-xs text-neon-mint">
                        <div className="uppercase tracking-[0.3em] text-[9px] mb-1">◤ PURCHASED</div>
                        NFT transferred to {address.slice(0, 6)}…{address.slice(-4)}.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* BROWSE PATH — no active listing */}
              {resolved.kind === 'browse' && (
                <div className="neon-panel hud-corners p-4 sm:p-5 space-y-3">
                  <span className="hud-corner hud-corner-tl" />
                  <span className="hud-corner hud-corner-tr" />
                  <span className="hud-corner hud-corner-bl" />
                  <span className="hud-corner hud-corner-br" />

                  <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-mint">
                    ◤ STATUS
                  </div>
                  <div className="text-sm text-white">
                    Minted NFT, no active marketplace listing right now.
                  </div>
                  <div className="text-[11px] font-mono text-gray-500">
                    The artist hasn't put this edition up for resale on the SC marketplace contract.
                    When an active listing appears it shows up here with a buy flow.
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link href="/mint" className="btn-neon text-[10px] text-center">
                      ◤ MINT YOUR OWN
                    </Link>
                    <button type="button" onClick={onClose} className="btn-ghost text-[10px] text-center">
                      ◌ CLOSE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function tokenAddressFor(pt: PaymentType): string | null {
  switch (pt) {
    case PaymentType.OGUN: return CONTRACTS.OGUN
    default: return null
  }
}

function labelForBuy(s: BuyStep): string {
  switch (s) {
    case 'approving': return '◌ SIGN APPROVE…'
    case 'waiting-approval': return '◌ CONFIRMING APPROVAL…'
    case 'buying': return '◌ SIGN BUY…'
    case 'waiting-buy': return '◌ CONFIRMING BUY…'
    case 'success': return '✓ BOUGHT'
    default: return 'BUY'
  }
}
