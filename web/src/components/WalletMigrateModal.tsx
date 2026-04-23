/**
 * WalletMigrateModal — escape hatch for legacy OAuth wallet users
 *
 * MODAL OVERLAY — user NEVER leaves SoundChain.
 *
 * Flow:
 * Step 1: Click "Reveal Secret Phrase" → Magic iframe opens in-app
 * Step 2: User copies their private key from Magic's iframe
 * Step 3: User pastes private key into our secure input
 * Step 4: We derive wallet address from key → verify it matches their OAuth wallet
 * Step 5: Show all assets (POL, OGUN, NFTs)
 * Step 6: "Transfer All" → sign locally with ethers.js → broadcast via direct RPC
 * Step 7: Assets arrive in HD wallet. Magic-free forever.
 *
 * Private key NEVER leaves the browser. NEVER sent to any server.
 * All signing happens client-side with ethers.js.
 */
import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { Key, Shield, ArrowRight, AlertTriangle, CheckCircle, Loader2, X, Copy, ExternalLink } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import { getPolBalance, getOgunBalance } from 'lib/directRpc'
import { toast } from 'react-toastify'
import { config } from '../config'

const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com'
const OGUN_ADDRESS = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'
const OGUN_ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function balanceOf(address) view returns (uint256)']

type Step = 'reveal' | 'paste' | 'verify' | 'review' | 'transfer' | 'done'

interface WalletMigrateModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletMigrateModal({ isOpen, onClose }: WalletMigrateModalProps) {
  const me = useMe()
  const { magic } = useMagicContext()

  const [step, setStep] = useState<Step>('reveal')
  const [privateKey, setPrivateKey] = useState('')
  const [derivedAddress, setDerivedAddress] = useState('')
  const [polBalance, setPolBalance] = useState('0')
  const [ogunBalance, setOgunBalanceState] = useState('0')
  const [transferring, setTransferring] = useState(false)
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const hdWalletAddress = (me as any)?.profile?.hdWalletAddress || (me as any)?.hdWalletAddress || ''
  const oauthWalletAddress = (me as any)?.profile?.magicWalletAddress ||
    (me as any)?.profile?.googleWalletAddress ||
    (me as any)?.profile?.discordWalletAddress || ''

  // Step 1: Reveal private key via Magic iframe
  const handleReveal = useCallback(async () => {
    if (!magic) { toast.error('Magic not loaded'); return }
    try {
      await (magic as any).user.revealPrivateKey()
      setStep('paste')
    } catch (err: any) {
      toast.error('Failed to open key reveal: ' + (err?.message || 'unknown'))
    }
  }, [magic])

  // Step 3: Verify pasted key matches OAuth wallet
  const handleVerify = useCallback(async () => {
    setError(null)
    const key = privateKey.trim()
    if (!key || (!key.startsWith('0x') && key.length !== 64 && key.length !== 66)) {
      setError('Invalid private key format. Should be 64 hex characters (with or without 0x prefix)')
      return
    }

    try {
      const normalizedKey = key.startsWith('0x') ? key : `0x${key}`
      const wallet = new ethers.Wallet(normalizedKey)
      const derived = wallet.address

      setDerivedAddress(derived)

      // Verify it matches OAuth wallet
      if (derived.toLowerCase() !== oauthWalletAddress.toLowerCase()) {
        setError(`Key derives address ${derived.slice(0, 8)}...${derived.slice(-6)} but your OAuth wallet is ${oauthWalletAddress.slice(0, 8)}...${oauthWalletAddress.slice(-6)}. Wrong key?`)
        return
      }

      // Fetch balances via direct RPC
      setStep('verify')
      const [pol, ogun] = await Promise.all([
        getPolBalance(derived),
        getOgunBalance(derived),
      ])
      setPolBalance(pol)
      setOgunBalanceState(ogun)
      setStep('review')
    } catch (err: any) {
      setError('Invalid private key: ' + (err?.message || 'could not derive address'))
    }
  }, [privateKey, oauthWalletAddress])

  // Step 6: Transfer ALL assets to HD wallet
  const handleTransferAll = useCallback(async () => {
    if (!hdWalletAddress) { toast.error('No HD wallet found on your profile'); return }
    setTransferring(true)
    setError(null)
    const hashes: string[] = []

    try {
      const normalizedKey = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
      const wallet = new ethers.Wallet(normalizedKey, provider)

      // Transfer OGUN first (needs POL for gas)
      const ogunAmount = parseFloat(ogunBalance)
      if (ogunAmount > 0) {
        toast.info('Transferring OGUN...')
        const ogunContract = new ethers.Contract(OGUN_ADDRESS, OGUN_ABI, wallet)
        const ogunWei = ethers.utils.parseEther(ogunAmount.toFixed(8))

        // Calculate 0.05% fee
        const feeRate = config.soundchainFee || 0.0005
        const feeWei = ethers.utils.parseEther((ogunAmount * feeRate).toFixed(8))
        const transferWei = ogunWei.sub(feeWei)

        // Fee to treasury
        if (feeWei.gt(0)) {
          const feeTx = await ogunContract.transfer(config.treasuryAddress, feeWei)
          await feeTx.wait()
          hashes.push(feeTx.hash)
        }

        // Amount to HD wallet
        const tx = await ogunContract.transfer(hdWalletAddress, transferWei)
        await tx.wait()
        hashes.push(tx.hash)
        toast.success(`OGUN transferred!`)
      }

      // Transfer POL (leave small amount for gas)
      const polAmount = parseFloat(polBalance)
      if (polAmount > 0.01) {
        toast.info('Transferring POL...')
        const gasPrice = await provider.getGasPrice()
        const gasCost = gasPrice.mul(21000)
        const polWei = ethers.utils.parseEther(polAmount.toFixed(8))
        const sendAmount = polWei.sub(gasCost.mul(2)) // Leave room for gas

        if (sendAmount.gt(0)) {
          // Fee
          const feeRate = config.soundchainFee || 0.0005
          const feeWei = sendAmount.mul(Math.floor(feeRate * 10000)).div(10000)

          if (feeWei.gt(0)) {
            const feeTx = await wallet.sendTransaction({ to: config.treasuryAddress, value: feeWei })
            await feeTx.wait()
            hashes.push(feeTx.hash)
          }

          // Remaining to HD wallet
          const remaining = sendAmount.sub(feeWei)
          if (remaining.gt(0)) {
            const tx = await wallet.sendTransaction({ to: hdWalletAddress, value: remaining })
            await tx.wait()
            hashes.push(tx.hash)
            toast.success('POL transferred!')
          }
        }
      }

      setTxHashes(hashes)
      setStep('done')
      toast.success('Migration complete! Your assets are in your HD wallet.')
    } catch (err: any) {
      console.error('Migration error:', err)
      setError('Transfer failed: ' + (err?.message || 'unknown error'))
      toast.error('Transfer failed — check console for details')
    } finally {
      setTransferring(false)
    }
  }, [privateKey, polBalance, ogunBalance, hdWalletAddress])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-neutral-900 border-2 border-amber-500/50 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/30 bg-amber-950 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-mono font-bold text-amber-400">WALLET MIGRATION</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            {['reveal', 'paste', 'review', 'transfer', 'done'].map((s, i) => (
              <span key={s} className={`px-2 py-0.5 rounded ${step === s ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5'}`}>
                {i + 1}. {s.toUpperCase()}
              </span>
            ))}
          </div>

          {/* Step 1: Reveal */}
          {step === 'reveal' && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono font-bold text-white">Step 1: Export Your Private Key</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Click below to open Magic's secure key reveal. Copy your private key — you'll need it in the next step.
              </p>
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-300">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Your private key gives FULL control of your wallet. Never share it with anyone. SoundChain never stores it.
              </div>
              <button onClick={handleReveal} className="w-full py-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-bold hover:bg-amber-500/30 transition flex items-center justify-center gap-2">
                <Key className="w-4 h-4" /> REVEAL SECRET PHRASE
              </button>
              <button onClick={() => setStep('paste')} className="w-full text-[10px] font-mono text-gray-500 hover:text-white">
                I already have my key → skip to paste
              </button>
            </div>
          )}

          {/* Step 2: Paste */}
          {step === 'paste' && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono font-bold text-white">Step 2: Paste Your Private Key</h3>
              <p className="text-xs text-gray-400">Paste the private key you copied from Magic. It stays in your browser — never sent to any server.</p>
              <input
                type="password"
                value={privateKey}
                onChange={e => { setPrivateKey(e.target.value); setError(null) }}
                placeholder="0x... or 64 hex characters"
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-3 text-sm font-mono text-white outline-none focus:border-amber-500/50"
              />
              {error && <div className="text-[10px] text-red-400 font-mono">{error}</div>}
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('reveal')} className="flex-1 py-2 rounded text-xs font-mono text-gray-400 border border-white/10 hover:bg-white/5">Back</button>
                <button onClick={handleVerify} disabled={!privateKey.trim()} className="flex-1 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold hover:bg-amber-500/30 transition disabled:opacity-50">
                  VERIFY KEY
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Verifying */}
          {step === 'verify' && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 mx-auto animate-spin" />
              <div className="text-sm font-mono text-amber-400">Verifying key + fetching balances...</div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono font-bold text-white">Step 3: Review Migration</h3>
              <div className="flex items-center gap-2 text-[10px] font-mono text-green-400">
                <CheckCircle className="w-3 h-3" /> Key verified — matches your OAuth wallet
              </div>

              <div className="p-3 rounded bg-black/40 border border-white/10 space-y-2">
                <div className="text-[9px] font-mono text-gray-500 uppercase">FROM: OAuth Wallet (Magic)</div>
                <div className="text-xs font-mono text-cyan-400 break-all">{derivedAddress}</div>
                <div className="flex gap-4 mt-2">
                  <div><span className="text-gray-500 text-[9px]">POL</span><div className="text-sm font-mono text-purple-400">{parseFloat(polBalance).toFixed(4)}</div></div>
                  <div><span className="text-gray-500 text-[9px]">OGUN</span><div className="text-sm font-mono text-yellow-400">{parseFloat(ogunBalance).toFixed(2)}</div></div>
                </div>
              </div>

              <div className="flex items-center justify-center"><ArrowRight className="w-5 h-5 text-amber-400" /></div>

              <div className="p-3 rounded bg-black/40 border border-green-500/20 space-y-1">
                <div className="text-[9px] font-mono text-gray-500 uppercase">TO: HD Wallet (yours forever)</div>
                <div className="text-xs font-mono text-green-400 break-all">{hdWalletAddress || 'No HD wallet — generate one first'}</div>
              </div>

              <div className="text-[9px] font-mono text-gray-600">0.05% fee on transfers goes to SoundChain Treasury. Gas paid from POL balance.</div>

              {error && <div className="text-[10px] text-red-400 font-mono">{error}</div>}

              <div className="flex items-center gap-2">
                <button onClick={() => setStep('paste')} className="flex-1 py-2 rounded text-xs font-mono text-gray-400 border border-white/10 hover:bg-white/5">Back</button>
                <button
                  onClick={handleTransferAll}
                  disabled={transferring || !hdWalletAddress}
                  className="flex-1 py-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-mono font-bold hover:bg-green-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {transferring ? <><Loader2 className="w-3 h-3 animate-spin" /> TRANSFERRING...</> : <><ArrowRight className="w-3 h-3" /> TRANSFER ALL TO HD WALLET</>}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h3 className="text-lg font-mono font-bold text-green-400">MIGRATION COMPLETE</h3>
              <p className="text-xs text-gray-400">Your assets are now in your HD wallet. No more Magic dependency.</p>

              {txHashes.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-gray-500 uppercase">Transaction Receipts</div>
                  {txHashes.map((hash, i) => (
                    <a key={i} href={`https://polygonscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300">
                      {hash.slice(0, 10)}...{hash.slice(-8)} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="w-full py-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 font-mono font-bold hover:bg-green-500/30 transition">
                CLOSE
              </button>
            </div>
          )}

          {/* Security footer */}
          <div className="text-[8px] font-mono text-gray-600 border-t border-white/5 pt-2">
            🔒 Your private key never leaves this browser. All signing happens client-side with ethers.js.
            Transactions broadcast via direct Polygon RPC (polygon-bor-rpc.publicnode.com). Zero Magic dependency.
          </div>
        </div>
      </div>
    </div>
  )
}
