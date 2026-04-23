/**
 * LegacyWalletBanner — floating prompt for OAuth wallet users
 *
 * Shows ONLY to users with Magic OAuth wallets (pre-Feb 2026).
 * Urges them to export their secret phrase for self-custody.
 *
 * Magic support confirmed: "If Magic goes offline or ceases services,
 * there's no way for anyone to retrieve funds controlled by those
 * private keys." This banner is the safety net.
 *
 * Dismissable per session, but returns every new session until
 * user clicks "I've saved my key" which sets a permanent flag.
 */
import { useState, useEffect } from 'react'
import { AlertTriangle, Key, Shield, X, ExternalLink } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'

const DISMISSED_KEY = 'soundchain_legacy_wallet_banner_dismissed'
const SAVED_KEY = 'soundchain_legacy_wallet_key_saved'

export function LegacyWalletBanner() {
  const me = useMe()
  const { magic } = useMagicContext()
  const [dismissed, setDismissed] = useState(true)
  const [revealing, setRevealing] = useState(false)

  // Only show to OAuth wallet users who haven't permanently dismissed
  useEffect(() => {
    if (typeof window === 'undefined') return
    const permanentlySaved = localStorage.getItem(SAVED_KEY) === 'true'
    if (permanentlySaved) { setDismissed(true); return }
    const sessionDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true'
    if (sessionDismissed) { setDismissed(true); return }

    // Show only if user has a Magic/OAuth wallet (legacy)
    const profile = me?.profile || me
    const hasMagicWallet = (profile as any)?.magicWalletAddress ||
      (profile as any)?.googleWalletAddress ||
      (profile as any)?.discordWalletAddress ||
      (profile as any)?.twitchWalletAddress ||
      (profile as any)?.emailWalletAddress
    if (hasMagicWallet) setDismissed(false)
  }, [me])

  const dismissSession = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  const markSaved = () => {
    localStorage.setItem(SAVED_KEY, 'true')
    setDismissed(true)
  }

  const revealKey = async () => {
    if (!magic) return
    setRevealing(true)
    try {
      await (magic as any).user.revealPrivateKey()
    } catch (err: any) {
      console.error('Reveal private key failed:', err)
    } finally {
      setRevealing(false)
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[100] animate-in slide-in-from-bottom-5">
      <div className="bg-amber-950 border-2 border-amber-500/50 rounded-xl shadow-2xl shadow-amber-500/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-amber-900/50 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-amber-400">IMPORTANT: LEGACY WALLET</span>
          </div>
          <button onClick={dismissSession} className="p-1 hover:bg-white/10 rounded">
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-amber-100 leading-relaxed">
            Your wallet is managed by Magic (a third-party service).
            <strong className="text-amber-400"> If Magic goes offline, your funds could become inaccessible.</strong>
          </p>

          <div className="p-3 rounded-lg bg-black/30 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
              <Key className="w-3.5 h-3.5" /> Export Your Secret Phrase
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Save your secret phrase to a secure location. With it, you can import your wallet
              into MetaMask, Trust Wallet, or any Web3 wallet — independent of Magic forever.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={revealKey}
              disabled={revealing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold hover:bg-amber-500/30 transition disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5" />
              {revealing ? 'OPENING...' : 'REVEAL SECRET PHRASE'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={markSaved}
              className="text-[10px] font-mono text-green-400 hover:text-green-300 underline"
            >
              ✓ I've saved my key — don't show again
            </button>
            <a
              href="https://magic.link/docs/wallets/wallet-ui/reveal-private-key"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-gray-400"
            >
              Learn more <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <p className="text-[9px] text-gray-600 leading-relaxed border-t border-white/5 pt-2">
            ⚠️ Never share your secret phrase with anyone. Anyone with it has full control
            of your wallet. SoundChain will never ask for your secret phrase.
          </p>
        </div>
      </div>
    </div>
  )
}
