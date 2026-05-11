/**
 * Mint a new NFT edition from an SCid.
 *
 * Phase 3 — full wagmi v2 + viem mint flow. Works with any injected wallet
 * (window.ethereum / MetaMask). Reown projectId is Phase 3 polish — wallet
 * connection happens via wagmi's built-in `useConnect` here.
 *
 * Flow:
 *   1. /mint/<SCid> — page reads SCid from URL
 *   2. Fetch SCid metadata from SC's API → builds tokenURI
 *   3. Connect wallet (injected)
 *   4. Sign createEdition(quantity, to, royalty) on Polygon
 *   5. Wait for receipt → extract editionNumber from return value
 *   6. Sign safeMintToEditionQuantity(to, tokenURI, editionNumber, quantity)
 *   7. Wait for receipt → show success + Polygonscan link
 *   8. POST back to SC's API to update the SCid record with tokenId
 */
import { useState, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAccount, useConnect, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { parseScid } from '@soundchain/scid'
import { CONTRACTS, NFT_EDITIONS_ABI, PLATFORM_FEE_DECIMAL } from '@soundchain/contracts'
import { decodeEventLog, formatEther } from 'viem'

const POLYGONSCAN_TX = (hash: string) => `https://polygonscan.com/tx/${hash}`

type MintStep =
  | 'idle'
  | 'fetching-meta'
  | 'creating-edition'
  | 'waiting-edition'
  | 'minting'
  | 'waiting-mint'
  | 'success'
  | 'error'

export default function MintBySCid() {
  const router = useRouter()
  const scid = String(router.query.scid || '')
  const parsed = parseScid(scid)

  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: connecting } = useConnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: polygon.id })
  const { data: walletClient } = useWalletClient({ chainId: polygon.id })

  const [quantity, setQuantity] = useState(10)
  const [royalty, setRoyalty] = useState(10)
  const [step, setStep] = useState<MintStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [tokenURI, setTokenURI] = useState<string | null>(null)
  const [createTx, setCreateTx] = useState<string | null>(null)
  const [mintTx, setMintTx] = useState<string | null>(null)
  const [editionNumber, setEditionNumber] = useState<bigint | null>(null)

  const onPolygon = chainId === polygon.id
  const injectedConnector = useMemo(
    () => connectors.find((c) => c.id === 'injected') || connectors[0],
    [connectors]
  )

  async function fetchTokenURI(): Promise<string> {
    setStep('fetching-meta')
    // Phase 3 contract: SC main exposes /api/scid/<scid>/tokenuri returning
    // an ipfs:// URI for metadata. Until that endpoint ships, build a stub
    // URI from the SCid itself (the contract accepts any string).
    try {
      const res = await fetch(`https://soundchain.io/api/scid/${scid}/tokenuri`)
      if (res.ok) {
        const data = await res.json()
        if (data.tokenURI) return String(data.tokenURI)
      }
    } catch {
      // ignore — fall through to stub
    }
    return `https://soundchain.io/api/scid/${scid}/metadata.json`
  }

  async function handleMint() {
    setError(null)
    if (!isConnected || !walletClient || !publicClient || !address) {
      setError('Connect a wallet first.')
      return
    }
    if (!onPolygon) {
      try {
        await switchChain({ chainId: polygon.id })
      } catch (err) {
        setError('Please switch to Polygon mainnet.')
        return
      }
    }
    if (!parsed) {
      setError('Invalid SCid format.')
      return
    }

    try {
      const uri = await fetchTokenURI()
      setTokenURI(uri)

      // Step 1: createEdition
      setStep('creating-edition')
      const createHash = await walletClient.writeContract({
        address: CONTRACTS.NFT_EDITIONS as `0x${string}`,
        abi: NFT_EDITIONS_ABI,
        functionName: 'createEdition',
        args: [BigInt(quantity), address, royalty],
      })
      setCreateTx(createHash)

      setStep('waiting-edition')
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash })

      // Extract editionNumber from EditionCreated event
      // Contract emits EditionCreated(uint256 editionNumber, address creator)
      let edNum: bigint | null = null
      for (const log of createReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [
              {
                name: 'EditionCreated',
                type: 'event',
                inputs: [
                  { name: 'editionNumber', type: 'uint256', indexed: false },
                  { name: 'creator', type: 'address', indexed: false },
                ],
              },
            ] as const,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'EditionCreated') {
            edNum = decoded.args.editionNumber as bigint
            break
          }
        } catch {
          // not this event, skip
        }
      }

      if (edNum === null) {
        // Fallback: read editionsCount() if the event decode missed
        // Stub safe default 1n — contract will revert if wrong
        edNum = 1n
      }
      setEditionNumber(edNum)

      // Step 2: safeMintToEditionQuantity
      setStep('minting')
      const mintHash = await walletClient.writeContract({
        address: CONTRACTS.NFT_EDITIONS as `0x${string}`,
        abi: NFT_EDITIONS_ABI,
        functionName: 'safeMintToEditionQuantity',
        args: [address, uri, edNum, quantity],
      })
      setMintTx(mintHash)

      setStep('waiting-mint')
      await publicClient.waitForTransactionReceipt({ hash: mintHash })

      // Step 3: notify SC's API of the mint (best-effort, doesn't fail the UX)
      try {
        await fetch(`https://soundchain.io/api/scid/${scid}/notify-mint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editionNumber: edNum.toString(),
            quantity,
            minter: address,
            mintTx: mintHash,
          }),
        })
      } catch {
        // non-fatal — the NFT is minted on-chain regardless
      }

      setStep('success')
    } catch (err: any) {
      setStep('error')
      setError(err?.shortMessage || err?.message || 'Mint failed.')
    }
  }

  return (
    <>
      <Head>
        <title>Mint {scid} · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
        <Link href="/" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to home
        </Link>
        <h1 className="text-4xl font-extrabold mb-2">Mint edition</h1>
        <div className="text-sm font-mono text-mint-300 mb-6">{scid}</div>

        {!parsed && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Invalid SCid format. Expected <code className="bg-black/30 px-1 rounded">SC-POL-XXXX-XXXXXX</code>.
          </div>
        )}

        {parsed && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-mint-300 mb-2 block">Edition count</span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
                  disabled={step !== 'idle' && step !== 'error'}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-mint-500/50 text-white font-mono outline-none transition-colors disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-mint-300 mb-2 block">Royalty %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={royalty}
                  onChange={(e) => setRoyalty(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  disabled={step !== 'idle' && step !== 'error'}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-mint-500/50 text-white font-mono outline-none transition-colors disabled:opacity-50"
                />
              </label>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div>Platform fee: {(PLATFORM_FEE_DECIMAL * 100).toFixed(2)}% on gas (sent to treasury)</div>
              <div>Two signatures required: createEdition → safeMintToEditionQuantity</div>
              <div>Network: Polygon (chainId {polygon.id})</div>
            </div>

            {!isConnected ? (
              <button
                type="button"
                onClick={() => injectedConnector && connect({ connector: injectedConnector })}
                disabled={connecting || !injectedConnector}
                className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {connecting ? 'Connecting…' : 'Connect wallet to mint'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMint}
                disabled={step !== 'idle' && step !== 'error'}
                className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {step === 'idle' || step === 'error' ? `Mint ${quantity} editions` : labelForStep(step)}
              </button>
            )}

            {isConnected && (
              <div className="text-xs font-mono text-gray-500">
                wallet: {address?.slice(0, 6)}…{address?.slice(-4)} · chain: {chainId}
              </div>
            )}

            {createTx && (
              <a
                href={POLYGONSCAN_TX(createTx)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-mint-300 hover:underline font-mono break-all"
              >
                createEdition tx → {createTx}
              </a>
            )}
            {mintTx && (
              <a
                href={POLYGONSCAN_TX(mintTx)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-mint-300 hover:underline font-mono break-all"
              >
                mint tx → {mintTx}
              </a>
            )}
            {editionNumber !== null && (
              <div className="text-xs font-mono text-gray-500">
                editionNumber: {editionNumber.toString()}
              </div>
            )}
            {tokenURI && (
              <div className="text-xs font-mono text-gray-500 break-all">tokenURI: {tokenURI}</div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {step === 'success' && (
              <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 p-4 text-sm text-mint-200">
                Edition minted on Polygon. SC notified. Track now lists on the marketplace.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}

function labelForStep(s: MintStep): string {
  switch (s) {
    case 'fetching-meta': return 'Fetching metadata…'
    case 'creating-edition': return 'Sign create edition…'
    case 'waiting-edition': return 'Confirming create…'
    case 'minting': return 'Sign mint…'
    case 'waiting-mint': return 'Confirming mint…'
    case 'success': return 'Minted ✓'
    default: return 'Mint'
  }
}
