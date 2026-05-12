/**
 * Marketplace item — view a listing + buy flow.
 *
 * Phase 4 — full wagmi v2 + viem buy flow against SoundchainMarketplaceEditions.
 *
 * Listing data comes from soundchain.io's API (still the canonical source
 * of truth for off-chain listing metadata). The actual buyItem tx is signed
 * by the buyer's wallet on this app.
 */
import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAccount, useConnect, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { CONTRACTS, MARKETPLACE_ABI, ERC20_ABI, PaymentType, PLATFORM_FEE_DECIMAL } from 'lib/contracts'
import { parseUnits, formatEther } from 'viem'

const POLYGONSCAN_TX = (hash: string) => `https://polygonscan.com/tx/${hash}`

type BuyStep = 'idle' | 'approving' | 'waiting-approval' | 'buying' | 'waiting-buy' | 'success' | 'error'

interface Listing {
  tokenId: string
  owner: string
  pricesWei: string[]            // 7-slot array, native units
  acceptedPayments: number       // bitfield: 1=POL, 2=OGUN, 4=USDC, ...
  metadata?: {
    title?: string
    artist?: string
    coverArtUrl?: string
  }
}

export default function MarketplaceItem() {
  const router = useRouter()
  const id = String(router.query.id || '')

  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: connecting } = useConnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: polygon.id })
  const { data: walletClient } = useWalletClient({ chainId: polygon.id })

  const [listing, setListing] = useState<Listing | null>(null)
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
        const res = await fetch(`https://soundchain.io/api/marketplace/listing/${id}`)
        if (!res.ok) throw new Error('Listing not found')
        const data = await res.json()
        if (!cancelled) setListing(data.listing || null)
      } catch {
        if (!cancelled) setListing(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const onPolygon = chainId === polygon.id
  const injectedConnector = connectors.find((c) => c.id === 'injected') || connectors[0]

  const acceptedPaymentList = listing
    ? Object.values(PaymentType)
        .filter((v) => typeof v === 'number')
        .map((v) => v as PaymentType)
        .filter((pt) => (listing.acceptedPayments & (1 << pt)) !== 0)
    : []

  const priceForCurrentPayment = listing?.pricesWei[paymentType] || '0'
  const priceBigInt = priceForCurrentPayment ? BigInt(priceForCurrentPayment) : 0n
  const platformFeeWei = (priceBigInt * BigInt(Math.round(PLATFORM_FEE_DECIMAL * 1_000_000))) / 1_000_000n

  async function handleBuy() {
    setError(null)
    if (!isConnected || !walletClient || !publicClient || !address || !listing) {
      setError('Connect a wallet first.')
      return
    }
    if (!onPolygon) {
      try {
        await switchChain({ chainId: polygon.id })
      } catch {
        setError('Please switch to Polygon mainnet.')
        return
      }
    }

    try {
      // ERC-20 paths need approve(marketplace, price) before buyItem
      const isNative = paymentType === PaymentType.POL
      if (!isNative) {
        const tokenAddress = tokenAddressFor(paymentType)
        if (!tokenAddress) {
          setError('Unsupported payment token (not yet wired in @soundchain/contracts).')
          return
        }

        // Check existing allowance — skip approve if sufficient
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

      // notify SC's API of the buy (best-effort)
      try {
        await fetch(`https://soundchain.io/api/marketplace/notify-buy`, {
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
    <>
      <Head>
        <title>Listing {id} · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
        <Link href="/marketplace" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to marketplace
        </Link>

        {loading && <div className="text-sm text-gray-500">Loading listing…</div>}

        {!loading && !listing && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Listing not found.
          </div>
        )}

        {listing && (
          <div className="space-y-6">
            {listing.metadata?.coverArtUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.metadata.coverArtUrl}
                alt={listing.metadata.title || ''}
                className="w-full max-w-md rounded-2xl border border-white/10"
              />
            )}
            <div>
              <h1 className="text-3xl font-extrabold mb-1">
                {listing.metadata?.title || `Token #${listing.tokenId}`}
              </h1>
              {listing.metadata?.artist && (
                <div className="text-sm text-gray-400">by {listing.metadata.artist}</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
              <div>
                <span className="text-xs uppercase tracking-widest text-mint-300 mb-2 block">Pay with</span>
                <div className="flex flex-wrap gap-2">
                  {acceptedPaymentList.length === 0 && (
                    <div className="text-xs text-gray-500">No payment options on this listing.</div>
                  )}
                  {acceptedPaymentList.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPaymentType(pt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        paymentType === pt
                          ? 'bg-mint-500 border-mint-500 text-black'
                          : 'bg-transparent border-white/10 text-gray-300 hover:border-mint-500/50'
                      }`}
                    >
                      {PaymentType[pt]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="font-mono text-sm space-y-1">
                <div>
                  <span className="text-gray-500">price:</span>{' '}
                  <span className="text-white">
                    {paymentType === PaymentType.POL
                      ? `${formatEther(priceBigInt)} POL`
                      : `${priceBigInt.toString()} ${PaymentType[paymentType]} (raw units)`}
                  </span>
                </div>
                <div className="text-xs text-gray-500">platform fee 0.05% included in tx flow</div>
              </div>

              {!isConnected ? (
                <button
                  type="button"
                  onClick={() => injectedConnector && connect({ connector: injectedConnector })}
                  disabled={connecting || !injectedConnector}
                  className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {connecting ? 'Connecting…' : 'Connect wallet to buy'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={step !== 'idle' && step !== 'error'}
                  className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {step === 'idle' || step === 'error' ? `Buy with ${PaymentType[paymentType]}` : labelForBuy(step)}
                </button>
              )}

              {approveTx && (
                <a
                  href={POLYGONSCAN_TX(approveTx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-mint-300 hover:underline font-mono break-all"
                >
                  approve tx → {approveTx}
                </a>
              )}
              {buyTx && (
                <a
                  href={POLYGONSCAN_TX(buyTx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-mint-300 hover:underline font-mono break-all"
                >
                  buy tx → {buyTx}
                </a>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              {step === 'success' && (
                <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 p-4 text-sm text-mint-200">
                  Purchased. NFT transferred to {address?.slice(0, 6)}…{address?.slice(-4)}.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function tokenAddressFor(pt: PaymentType): string | null {
  // POL is native (no token contract). OGUN address wired; others pending
  // once the cross-chain token-by-Gnosis-Safe map ships (per CLAUDE.md notes).
  switch (pt) {
    case PaymentType.OGUN: return CONTRACTS.OGUN
    default: return null
  }
}

function labelForBuy(s: BuyStep): string {
  switch (s) {
    case 'approving': return 'Sign approve…'
    case 'waiting-approval': return 'Confirming approval…'
    case 'buying': return 'Sign buy…'
    case 'waiting-buy': return 'Confirming buy…'
    case 'success': return 'Bought ✓'
    default: return 'Buy'
  }
}
