import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Coins, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { useBlockchainV2 } from 'hooks/useBlockchainV2'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'

const PRESETS = [1, 5, 10, 25]

interface TipPostModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  recipientProfileId: string
  recipientName?: string
  onTipped?: (amount: number) => void
}

export const TipPostModal = ({
  isOpen,
  onClose,
  postId,
  recipientProfileId,
  recipientName,
  onTipped,
}: TipPostModalProps) => {
  const me = useMe()
  const { sendOgun } = useBlockchainV2()
  const { web3, account } = useMagicContext()

  const [amount, setAmount] = useState<string>('5')
  const [recipientWallet, setRecipientWallet] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [sending, setSending] = useState(false)

  // Resolve recipient wallet on open
  useEffect(() => {
    if (!isOpen || !recipientProfileId) return
    let cancelled = false
    setResolving(true)
    fetch(`/api/profiles/wallet?profileId=${recipientProfileId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setRecipientWallet(data.walletAddress || null)
      })
      .catch(() => { if (!cancelled) setRecipientWallet(null) })
      .finally(() => { if (!cancelled) setResolving(false) })
    return () => { cancelled = true }
  }, [isOpen, recipientProfileId])

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const senderWallet = me?.magicWalletAddress || me?.googleWalletAddress || (account ?? null)

  const amountNum = parseFloat(amount)
  const validAmount = isFinite(amountNum) && amountNum > 0
  const canSend = validAmount && !!recipientWallet && !!senderWallet && !!web3 && !sending && !resolving

  const handleTip = async () => {
    if (!canSend) return
    if (!recipientWallet) return toast.error('Could not resolve recipient wallet')
    if (!senderWallet) return toast.error('Connect a wallet to tip')
    if (!web3) return toast.error('Web3 not initialized')
    if (recipientWallet.toLowerCase() === senderWallet.toLowerCase()) {
      return toast.error('Cannot tip your own post')
    }

    setSending(true)
    try {
      const tx = sendOgun(recipientWallet, senderWallet, String(amountNum))
      const receipt: any = await tx.execute(web3)
      const txHash =
        receipt?.transactionHash ||
        receipt?.hash ||
        receipt?.receipt?.transactionHash ||
        ''

      // Record tip server-side (best-effort — the on-chain transfer already succeeded)
      await fetch('/api/feed/tip', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          amount: amountNum,
          txHash: txHash || `pending-${Date.now()}`,
          fromAddress: senderWallet,
          toAddress: recipientWallet,
        }),
      }).catch(() => { /* on-chain succeeded, audit failure is non-fatal */ })

      toast.success(`Tipped ${amountNum} OGUN${recipientName ? ` to ${recipientName}` : ''}!`)
      onTipped?.(amountNum)
      onClose()
    } catch (err: any) {
      console.error('Tip failed:', err)
      toast.error(err?.message || 'Tip failed')
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={sending ? undefined : onClose} />

      <div className="relative z-10 w-full sm:max-w-md mx-0 sm:mx-4 mb-0 sm:mb-0 overflow-hidden rounded-t-2xl sm:rounded-2xl border border-yellow-500/30 bg-gray-900/95 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />

        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tip OGUN</h2>
              <p className="text-xs text-gray-400">
                {recipientName ? `Support ${recipientName}` : 'Support this post'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount presets */}
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`py-2 rounded-lg text-sm font-semibold transition-all border ${
                  amount === String(p)
                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                    : 'bg-black/40 border-gray-700 text-gray-300 hover:border-yellow-500/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Amount (OGUN)</label>
            <input
              type="number"
              min="0.0001"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-gray-700 text-white text-sm focus:border-yellow-500/60 focus:outline-none"
              placeholder="5"
            />
          </div>

          {/* Recipient address preview */}
          <div className="text-[11px] text-gray-500 font-mono break-all">
            {resolving ? (
              'Resolving recipient wallet…'
            ) : recipientWallet ? (
              <>To: <span className="text-cyan-400">{recipientWallet}</span></>
            ) : (
              <span className="text-red-400">Recipient has no on-chain wallet — cannot tip yet.</span>
            )}
          </div>

          <p className="text-[11px] text-gray-500">
            0.05% platform fee auto-deducted to treasury. Network: Polygon.
          </p>

          <button
            onClick={handleTip}
            disabled={!canSend}
            className="w-full py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-yellow-500 to-orange-500 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            {sending ? 'Sending…' : validAmount ? `Send ${amountNum} OGUN` : 'Enter amount'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
