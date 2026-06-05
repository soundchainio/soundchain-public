import { useEffect, useState, useCallback } from 'react'
import { Lock, Save, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'

// ─── MANAGER bank vault (owner-only) ──────────────────────────────────────────
// The fiat side of pay-to-reveal. A pro MAY store traditional bank/wire details
// for promoters who pay off-chain. They are sent to /api/manager/bank, encrypted
// at rest (AES-256-GCM, server-only key), and only ever decrypted to a promoter
// who has FUNDED an escrow. The owner only ever sees a masked echo (•••• 4321) —
// the raw numbers never round-trip back to the browser.

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'accountName', label: 'Account holder', placeholder: 'Legal name on the account' },
  { key: 'bankName', label: 'Bank', placeholder: 'Bank name' },
  { key: 'accountNumber', label: 'Account number', placeholder: 'Account / IBAN local' },
  { key: 'routingNumber', label: 'Routing / sort code', placeholder: 'ABA / sort code' },
  { key: 'swift', label: 'SWIFT / BIC', placeholder: 'For international wires' },
  { key: 'iban', label: 'IBAN', placeholder: 'International account number' },
  { key: 'notes', label: 'Notes', placeholder: 'Reference, intermediary bank, etc.' },
]

export function ManagerBankVault() {
  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [masked, setMasked] = useState<Record<string, string>>({})
  const [configured, setConfigured] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/manager/bank')
      .then((r) => r.json().catch(() => ({})))
      .then((j) => {
        if (cancelled) return
        if (j.masked) setMasked(j.masked)
        if (typeof j.configured === 'boolean') setConfigured(j.configured)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const save = useCallback(async () => {
    setError(''); setSaving(true)
    try {
      const r = await fetch('/api/manager/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(j.error || 'Could not save bank details.')
      } else {
        setMasked(j.masked || {})
        setValues({})
        setSaved(true); setTimeout(() => setSaved(false), 2000)
      }
    } catch (e: any) {
      setError(e?.message || 'Could not save bank details.')
    } finally {
      setSaving(false)
    }
  }, [values])

  return (
    <section className="rounded-2xl border border-gray-800 bg-black/40 p-4">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <Lock className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Bank vault — pay-to-reveal</span>
        <span className="ml-auto">{expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
            Encrypted at rest with a server-only key. Revealed only to a promoter who has funded an escrow — never shown back here in full.
          </p>

          {!configured && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-300">
              The encryption key isn&apos;t configured on the server yet, so bank details can&apos;t be stored. Your crypto payout address still works for the on-chain rail.
            </p>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.key === 'notes' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-[11px] font-medium text-gray-400">
                  {f.label}
                  {masked[f.key] && <span className="ml-1.5 font-mono text-[10px] text-emerald-400/80">saved: {masked[f.key]}</span>}
                </label>
                <input
                  type="text"
                  value={values[f.key] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  disabled={!configured}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}

          <button
            onClick={save}
            disabled={saving || !configured || Object.values(values).every((v) => !v)}
            className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save bank details'}
          </button>
        </div>
      )}
    </section>
  )
}

export default ManagerBankVault
