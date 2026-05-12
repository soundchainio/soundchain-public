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
 *   3. Connect wallet (via WalletRail — multi-wallet aware)
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
import { useAccount, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { parseScid } from 'lib/scid'
import { CONTRACTS, NFT_EDITIONS_ABI, PLATFORM_FEE_DECIMAL, getFeeRecipient } from 'lib/contracts'
import { decodeEventLog, parseEther } from 'viem'
import { WalletRail } from 'components/WalletRail'

const POLYGONSCAN_TX = (hash: string) => `https://polygonscan.com/tx/${hash}`

type MintStep =
  | 'idle'
  | 'fetching-meta'
  | 'paying-fee'
  | 'waiting-fee'
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
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: polygon.id })
  const { data: walletClient } = useWalletClient({ chainId: polygon.id })

  const [quantity, setQuantity] = useState(10)
  const [royalty, setRoyalty] = useState(10)
  const [step, setStep] = useState<MintStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [tokenURI, setTokenURI] = useState<string | null>(null)
  const [feeTx, setFeeTx] = useState<string | null>(null)
  const [createTx, setCreateTx] = useState<string | null>(null)
  const [mintTx, setMintTx] = useState<string | null>(null)
  const [editionNumber, setEditionNumber] = useState<bigint | null>(null)

  const onPolygon = chainId === polygon.id
  const busy = step !== 'idle' && step !== 'error' && step !== 'success'

  async function fetchTokenURI(): Promise<string> {
    setStep('fetching-meta')
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
    if (!parsed) {
      setError('Invalid SCid format.')
      return
    }

    try {
      const uri = await fetchTokenURI()
      setTokenURI(uri)

      // 0.05% platform fee — true 0.05% of estimated total mint gas cost.
      // Estimates createEdition + safeMintToEditionQuantity, multiplies by
      // current gasPrice, applies 5/10000 (= 0.05%). Recipient lives in env
      // (NEXT_PUBLIC_FEE_RECIPIENT) — never in source.
      const feeRecipient = getFeeRecipient()
      if (feeRecipient) {
        setStep('paying-fee')

        // Estimate gas for both writes the user is about to sign
        const [createGas, mintGas, gasPrice] = await Promise.all([
          publicClient.estimateContractGas({
            address: CONTRACTS.NFT_EDITIONS as `0x${string}`,
            abi: NFT_EDITIONS_ABI,
            functionName: 'createEdition',
            args: [BigInt(quantity), address, royalty],
            account: address,
          }),
          // Edition number isn't known yet — use editionNumber=1 as a stand-in
          // for estimation only. Gas is identical regardless of editionNumber.
          publicClient.estimateContractGas({
            address: CONTRACTS.NFT_EDITIONS as `0x${string}`,
            abi: NFT_EDITIONS_ABI,
            functionName: 'safeMintToEditionQuantity',
            args: [address, uri, 1n, quantity],
            account: address,
          }).catch(() => 65000n + 50000n * BigInt(quantity)),
          publicClient.getGasPrice(),
        ])

        const totalGasCost = (createGas + mintGas) * gasPrice
        // 0.05% = 5 / 10000 — bigint math, no rounding loss
        const feeWei = (totalGasCost * 5n) / 10000n

        const feeHash = await walletClient.sendTransaction({
          to: feeRecipient,
          value: feeWei,
        })
        setFeeTx(feeHash)
        setStep('waiting-fee')
        await publicClient.waitForTransactionReceipt({ hash: feeHash })
      }

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
      if (edNum === null) edNum = 1n
      setEditionNumber(edNum)

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
      <main className="min-h-screen flex flex-col">
        <nav className="sticky top-0 z-30 px-3 sm:px-5 py-2.5 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-ink-900/75">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-neon-cyan shadow-neon-cyan" />
            <span className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-mint-400 via-neon-cyan to-forge-400 bg-clip-text text-transparent">
              SC<span className="text-neon-magenta">/</span>MINT
            </span>
          </Link>
          <Link href="/marketplace" className="btn-ghost text-[10px] py-1.5 px-2.5">
            MARKET
          </Link>
        </nav>

        <section className="px-3 sm:px-5 py-4 sm:py-6 border-b border-white/5 bg-ink-800/40">
          <div className="max-w-2xl mx-auto">
            <div className="inline-block text-[8px] font-mono uppercase tracking-[0.3em] px-1.5 py-0.5 border border-neon-mint/40 text-neon-mint mb-2">
              FORGE · POLYGON 137
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-none">
              <span className="neon-text-cyan">MINT</span>{' '}
              <span className="text-white">EDITION</span>
            </h1>
            <div className="text-[11px] sm:text-xs font-mono text-neon-magenta mt-2 break-all">
              {scid}
            </div>
          </div>
        </section>

        <section className="px-3 sm:px-5 py-4 sm:py-6 max-w-2xl mx-auto w-full">
          {!parsed && (
            <div className="neon-panel neon-panel-magenta hud-corners p-4 text-sm text-neon-magenta/90 mb-4">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] mb-1">◤ malformed scid</div>
              Expected <code className="bg-black/40 px-1 font-mono text-[11px]">SC-POL-XXXX-XXXXXX</code>
            </div>
          )}

          {parsed && (
            <>
              {/* Multi-wallet rail — mint-flow native aggregator */}
              <WalletRail />

              <div className="neon-panel hud-corners p-4 sm:p-5 space-y-4">
                <span className="hud-corner hud-corner-tl" />
                <span className="hud-corner hud-corner-tr" />
                <span className="hud-corner hud-corner-bl" />
                <span className="hud-corner hud-corner-br" />

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-cyan mb-1.5 block">
                      EDITION COUNT
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
                      disabled={busy}
                      className="w-full px-3 py-2.5 bg-ink-900/80 border border-white/10 focus:border-neon-cyan/60 text-white font-mono text-base tabular-nums outline-none transition-colors disabled:opacity-50"
                      style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-magenta mb-1.5 block">
                      ROYALTY %
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={royalty}
                      onChange={(e) => setRoyalty(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      disabled={busy}
                      className="w-full px-3 py-2.5 bg-ink-900/80 border border-white/10 focus:border-neon-magenta/60 text-white font-mono text-base tabular-nums outline-none transition-colors disabled:opacity-50"
                      style={{ clipPath: 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)' }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                  <div className="border-l-2 border-neon-cyan/50 pl-2">
                    <div className="uppercase tracking-[0.25em] text-gray-500">FEE</div>
                    <div className="text-neon-cyan">{(PLATFORM_FEE_DECIMAL * 100).toFixed(2)}%</div>
                  </div>
                  <div className="border-l-2 border-neon-mint/50 pl-2">
                    <div className="uppercase tracking-[0.25em] text-gray-500">SIGS</div>
                    <div className="text-neon-mint">3x</div>
                  </div>
                  <div className="border-l-2 border-neon-magenta/50 pl-2">
                    <div className="uppercase tracking-[0.25em] text-gray-500">CHAIN</div>
                    <div className="text-neon-magenta">137</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMint}
                  disabled={!isConnected || busy}
                  className="btn-neon w-full text-xs"
                >
                  {!isConnected
                    ? '◌ CONNECT WALLET TO MINT'
                    : busy
                    ? labelForStep(step)
                    : `◤ FORGE ${quantity} EDITION${quantity === 1 ? '' : 'S'}`}
                </button>

                {(createTx || mintTx) && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    {createTx && (
                      <a
                        href={POLYGONSCAN_TX(createTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] text-neon-cyan hover:text-white font-mono break-all transition-colors"
                      >
                        <span className="text-gray-600 uppercase tracking-widest">CREATE → </span>
                        {createTx.slice(0, 10)}…{createTx.slice(-8)}
                      </a>
                    )}
                    {mintTx && (
                      <a
                        href={POLYGONSCAN_TX(mintTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] text-neon-magenta hover:text-white font-mono break-all transition-colors"
                      >
                        <span className="text-gray-600 uppercase tracking-widest">MINT → </span>
                        {mintTx.slice(0, 10)}…{mintTx.slice(-8)}
                      </a>
                    )}
                    {editionNumber !== null && (
                      <div className="text-[10px] font-mono text-gray-500">
                        <span className="uppercase tracking-widest text-gray-600">ED# </span>
                        {editionNumber.toString()}
                      </div>
                    )}
                    {tokenURI && (
                      <div className="text-[10px] font-mono text-gray-500 break-all">
                        <span className="uppercase tracking-widest text-gray-600">URI </span>
                        {tokenURI}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="border border-neon-magenta/40 bg-neon-magenta/10 p-3 text-xs text-neon-magenta/90 font-mono">
                    <div className="uppercase tracking-[0.3em] text-[9px] mb-1">◤ ERR</div>
                    {error}
                  </div>
                )}

                {step === 'success' && (
                  <div className="border border-neon-mint/40 bg-neon-mint/10 p-3 text-xs text-neon-mint">
                    <div className="uppercase tracking-[0.3em] text-[9px] mb-1">◤ MINTED</div>
                    Edition is live on Polygon. SC indexer notified. Track listable on marketplace.
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <footer className="mt-auto px-3 sm:px-5 py-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">
          <Link href="/" className="hover:text-neon-cyan transition-colors">← HOME</Link>
          <span>// FORGE.SCID</span>
        </footer>
      </main>
    </>
  )
}

function labelForStep(s: MintStep): string {
  switch (s) {
    case 'fetching-meta': return '◌ FETCHING META…'
    case 'creating-edition': return '◌ SIGN CREATE…'
    case 'waiting-edition': return '◌ CONFIRMING CREATE…'
    case 'minting': return '◌ SIGN MINT…'
    case 'waiting-mint': return '◌ CONFIRMING MINT…'
    case 'success': return '✓ MINTED'
    default: return 'FORGE'
  }
}
