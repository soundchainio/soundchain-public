import { useMemo, useState } from 'react'
import { Wallet, ShieldCheck, Copy, Check, Loader2, Plus, Lock, Unlock, AlertCircle, Coins } from 'lucide-react'
import { useWallet } from 'hooks/useWallet'
import { t } from 'lib/managerI18n'
import {
  BOOKING_TOKENS, tokenBySymbol, canOneTapPay, chainName, connectInjected,
  sendNativeDeposit, createEscrow, confirmEscrow, revealBankDetails,
  PLATFORM_FEE_RATE, BookingToken, CreatedEscrow,
} from 'lib/manager/escrow'
import { TokenPickerModal } from './TokenPickerModal'

// ─── MANAGER booking escrow — the "join the whitelist" payment surface ─────────
// Renders like an allowlist mint: connect wallet → pick token(s) (BTC·ETH·SOL top)
// → deposit → the on-chain deposit locks the date and reveals the pro's payout.
// Built for ZERO hiccups: every state is handled, nothing fakes success, and a
// non-EVM coin is never shown an EVM address to send to.

interface ManagerBookingEscrowProps {
  profileId: string
  displayName: string
  payoutAddress?: string
  depositHint?: string // the pro's deposit-schedule / rate text, shown as guidance
  payerName?: string
  payerEmail?: string
  inquiryId?: string
  lang?: string
}

type Phase = 'idle' | 'creating' | 'deposit' | 'confirming' | 'funded' | 'bridge'

export function ManagerBookingEscrow({
  profileId, displayName, payoutAddress, depositHint, payerName, payerEmail, inquiryId, lang,
}: ManagerBookingEscrowProps) {
  const wallet = useWallet()
  const [injected, setInjected] = useState<{ signer: any; address: string; chainId: number } | null>(null)

  const [amount, setAmount] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [payWith, setPayWith] = useState<string>('') // the single token used for THIS deposit
  const [pickerOpen, setPickerOpen] = useState(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [escrow, setEscrow] = useState<CreatedEscrow | null>(null)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [reveal, setReveal] = useState<{ bank: Record<string, string>; payoutAddress: string } | null>(null)

  // Prefer an explicitly-connected injected wallet; else the SC user's Magic wallet.
  const active = injected || (wallet.isConnected && wallet.signer
    ? { signer: wallet.signer, address: wallet.address || '', chainId: wallet.chainId || 137 }
    : null)

  const payToken: BookingToken | undefined = useMemo(
    () => tokenBySymbol(payWith) || (selected[0] ? tokenBySymbol(selected[0]) : undefined),
    [payWith, selected],
  )

  const toggleToken = (sym: string) => {
    setSelected((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
      // Keep the "pay with" token valid.
      if (!next.includes(payWith)) setPayWith(next[0] || '')
      else if (!payWith && next.length) setPayWith(next[0])
      return next
    })
  }

  const connect = async () => {
    setError('')
    try {
      const w = await connectInjected()
      if (w) { setInjected({ signer: w.signer, address: w.address, chainId: w.chainId }); return }
      if (!wallet.isConnected) setError('No wallet found. Install a wallet, or copy the deposit address to pay manually.')
    } catch (e: any) {
      setError(e?.message || 'Could not connect wallet.')
    }
  }

  const copyAddr = async (addr: string) => {
    try { await navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  // Step 1 — register the escrow + get the deposit destination + reveal token.
  const joinWhitelist = async () => {
    setError('')
    const tok = payToken
    if (!amount || !/[0-9]/.test(amount)) { setError('Enter a deposit amount.'); return }
    if (!tok) { setError('Choose a payment token.'); return }
    setPhase('creating')
    try {
      const created = await createEscrow({ profileId, token: tok.symbol, amount, payerName, payerEmail, inquiryId })
      setEscrow(created)
      setPhase(tok.rail === 'bridge' ? 'bridge' : 'deposit')
    } catch (e: any) {
      setError(e?.message || 'Could not start the escrow.')
      setPhase('idle')
    }
  }

  // Step 2a — one-tap native send (only when safe: chain's native coin).
  const payWithWallet = async () => {
    if (!escrow || !active?.signer) return
    setError(''); setPhase('confirming')
    try {
      const hash = await sendNativeDeposit(active.signer, escrow.destination, amount)
      setTxHash(hash)
      await runConfirm(hash, active.chainId)
    } catch (e: any) {
      setError(e?.message || 'The wallet transaction was rejected or failed.')
      setPhase('deposit')
    }
  }

  // Step 2b — confirm a deposit by tx hash (manual or after one-tap).
  const runConfirm = async (hash: string, chainId: number) => {
    if (!escrow) return
    setError(''); setPhase('confirming')
    try {
      const res = await confirmEscrow({ escrowId: escrow.escrowId, txHash: hash, chainId, fromAddress: active?.address })
      if (res.status === 'funded') {
        setPhase('funded')
        const r = await revealBankDetails(escrow.escrowId, escrow.revealToken)
        setReveal(r)
      } else if (res.httpStatus === 202 || res.status === 'pending') {
        setError(res.message || 'Not yet confirmed on-chain — try again in a moment.')
        setPhase('deposit')
      } else if (res.status === 'pending_verify') {
        setPhase('bridge') // recorded, awaiting the artist's confirmation
      } else {
        setError(res.error || 'Could not confirm the deposit.')
        setPhase('deposit')
      }
    } catch (e: any) {
      setError(e?.message || 'Could not confirm the deposit.')
      setPhase('deposit')
    }
  }

  const confirmManual = async () => {
    const chainId = active?.chainId || 137
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) { setError('Paste a valid 0x… transaction hash.'); return }
    await runConfirm(txHash.trim(), chainId)
  }

  const feeNote = `${(PLATFORM_FEE_RATE * 100).toFixed(2)}% platform fee on release`
  const labelCls = 'block text-[11px] font-medium text-gray-400 mb-1'
  const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyan-500 focus:outline-none'

  // ── Funded: reveal unlocked ──
  if (phase === 'funded') {
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Unlock className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">{t(lang, 'escrowFunded')}</h2>
        </div>
        <p className="text-[13px] text-gray-300">{t(lang, 'dateLocked')}</p>
        <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-3 space-y-2 text-[13px]">
          {reveal?.payoutAddress && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500">Payout address</span>
              <span className="break-all text-right font-mono text-emerald-300">{reveal.payoutAddress}</span>
            </div>
          )}
          {reveal?.bank && Object.keys(reveal.bank).length > 0 ? (
            Object.entries(reveal.bank).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3">
                <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="break-all text-right text-gray-200">{v}</span>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-gray-500">{reveal ? 'No off-chain bank details on file — settle to the payout address above.' : 'Reveal pending…'}</p>
          )}
        </div>
      </section>
    )
  }

  // ── Bridge / awaiting artist confirmation (non-EVM coins) ──
  if (phase === 'bridge') {
    return (
      <section className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">{t(lang, 'bookingRegistered')}</h2>
        </div>
        <p className="text-[13px] text-gray-300">
          {payToken?.display} settles via the ZetaChain bridge. Your booking deposit is registered — coordinate the transfer with {displayName}; they confirm receipt to unlock the reveal and lock the date.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-black/30 px-3 py-2 text-[12px] text-violet-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Awaiting {displayName}&apos;s confirmation
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-black/60 p-5 space-y-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">{t(lang, 'payInCrypto')}</h2>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-300">
          <Lock className="h-2.5 w-2.5" /> escrow
        </span>
      </div>
      <p className="text-[12px] text-gray-500">{t(lang, 'whitelistBlurb')}</p>

      {/* Amount */}
      <div>
        <label className={labelCls}>{t(lang, 'depositAmount')}</label>
        <input
          type="text" inputMode="decimal" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={payToken ? `e.g. 0.5 ${payToken.display}` : 'e.g. 0.5'}
          className={inputCls}
        />
        {depositHint && <p className="mt-1 text-[10px] text-gray-600">{displayName}&apos;s terms: {depositHint}</p>}
      </div>

      {/* Token selection */}
      <div>
        <label className={labelCls}>{t(lang, 'paymentToken')}</label>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 hover:border-cyan-500"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            {selected.length === 0 ? (
              <span className="text-gray-500">BTC · ETH · SOL + 21 more</span>
            ) : (
              selected.map((s) => {
                const tk = tokenBySymbol(s)
                return (
                  <span
                    key={s}
                    onClick={(e) => { e.stopPropagation(); setPayWith(s) }}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      payWith === s ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {tk?.icon} {tk?.display}
                  </span>
                )
              })
            )}
          </span>
          <Plus className="h-4 w-4 flex-shrink-0 text-gray-500" />
        </button>
        {selected.length > 1 && (
          <p className="mt-1 text-[10px] text-gray-600">Paying this deposit with <span className="text-cyan-300">{payToken?.display}</span> — tap a chip to switch.</p>
        )}
      </div>

      {/* Wallet */}
      <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
        <span className="flex items-center gap-2 text-[12px] text-gray-400">
          <Wallet className="h-3.5 w-3.5 text-cyan-400" />
          {active ? (
            <span className="font-mono text-gray-300">{active.address.slice(0, 6)}…{active.address.slice(-4)}{active.chainId ? ` · ${chainName(active.chainId)}` : ''}</span>
          ) : (
            t(lang, 'walletNotConnected')
          )}
        </span>
        {!active && (
          <button onClick={connect} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/25">
            {t(lang, 'connectWallet')}
          </button>
        )}
      </div>

      {/* Fee + action */}
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>{feeNote}</span>
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-cyan-400" /> ZetaChain · 24 tokens</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Phase: idle → join */}
      {(phase === 'idle' || phase === 'creating') && (
        <button
          onClick={joinWhitelist}
          disabled={phase === 'creating' || !amount || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === 'creating' ? <><Loader2 className="h-4 w-4 animate-spin" /> {t(lang, 'starting')}</> : <><Lock className="h-4 w-4" /> {t(lang, 'joinWhitelist')}</>}
        </button>
      )}

      {/* Phase: deposit (EVM) */}
      {escrow && (phase === 'deposit' || phase === 'confirming') && (
        <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-black/40 p-3">
          {canOneTapPay(payToken, active?.chainId ?? null) && active?.signer && (
            <button
              onClick={payWithWallet}
              disabled={phase === 'confirming'}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
            >
              {phase === 'confirming' ? <><Loader2 className="h-4 w-4 animate-spin" /> {t(lang, 'confirming')}</> : <><Wallet className="h-4 w-4" /> Pay {amount} {payToken?.display} with wallet</>}
            </button>
          )}

          <div>
            <p className="mb-1 text-[11px] text-gray-400">
              {t(lang, 'sendTo')} {payToken?.display}{active?.chainId ? ` · ${chainName(active.chainId)}` : ''}
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-2">
              <span className="flex-1 break-all font-mono text-[11px] text-cyan-300">{escrow.destination}</span>
              <button onClick={() => copyAddr(escrow.destination)} className="rounded p-1 text-gray-400 hover:text-white">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            {escrow.escrowContract
              ? <p className="mt-1 text-[10px] text-emerald-400/80">Custodial escrow — released to {displayName} on performance.</p>
              : <p className="mt-1 text-[10px] text-gray-600">Direct to {displayName}&apos;s payout address.</p>}
          </div>

          <div>
            <label className={labelCls}>{t(lang, 'pasteTxHash')}</label>
            <div className="flex gap-2">
              <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x…" className={inputCls} />
              <button
                onClick={confirmManual}
                disabled={phase === 'confirming'}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-500/20 px-3 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-40"
              >
                {phase === 'confirming' ? <Loader2 className="h-4 w-4 animate-spin" /> : t(lang, 'confirmDeposit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <TokenPickerModal selected={selected} onToggle={toggleToken} onClose={() => setPickerOpen(false)} />
      )}
    </section>
  )
}

export default ManagerBookingEscrow
