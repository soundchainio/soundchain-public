/**
 * /wallet — Standalone wallet page (Vercel-direct, NO Lambda)
 *
 * Shows OGUN + POL balances, wallet address, transaction links.
 * Uses useMagicContext for balance data (direct RPC, not Apollo).
 * Critical page — users' assets live here.
 */
import { ReactElement, useState } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { DexNavBar } from 'components/DexNavBar'
import { useMagicContext } from 'hooks/useMagicContext'
import { Wallet, Copy, ExternalLink, ArrowUpRight, ArrowDownLeft, Coins, Check, Shield } from 'lucide-react'
import { toast } from 'react-toastify'
import Link from 'next/link'

export default function WalletPage() {
  const me = useMe()
  const router = useRouter()
  const { account, ogunBalance, balance: polBalance } = useMagicContext()
  const [copied, setCopied] = useState(false)

  const walletAddress = account ||
    (me as any)?.profile?.hdWalletAddress ||
    (me as any)?.profile?.magicWalletAddress ||
    (me as any)?.profile?.googleWalletAddress || null

  const copyAddress = () => {
    if (!walletAddress) return
    if (typeof navigator.share === 'function') {
      navigator.share({ text: walletAddress }).catch(() => {})
    } else {
      const ta = document.createElement('textarea')
      ta.value = walletAddress
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-black text-white">
        <DexNavBar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto" />
            <div className="text-gray-400 font-mono text-sm">Connect your wallet to view balances</div>
            <Link href="/login" className="inline-block px-6 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DexNavBar />

      {/* Nav pills */}
      <div className="border-b border-cyan-500/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-2">
          <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/users/${me.profile.userHandle}` }] : []),
                { id: 'nodes', label: 'Nodes', route: '/nodes' },
                { id: 'wallet', label: 'Wallet', route: '/wallet' },
                { id: 'explore3d', label: 'Explore 3D', route: '/explore3d' },
                { id: 'land', label: 'Land Atlas', route: '/land' },
                { id: 'gallery3d', label: 'Gallery 3D', route: '/gallery3d' },
                { id: 'arena', label: 'Arena', route: '/arena' },
                { id: 'archive', label: 'Archive', route: '/archive' },
              ].map(item => (
                <button key={item.id} onClick={() => router.push(item.route)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${item.id === 'wallet' ? 'bg-white/15 text-white border border-white/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Wallet className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-bold text-white">MY WALLET</h1>
            <p className="text-[10px] font-mono text-gray-500">Polygon Mainnet · Chain ID 137</p>
          </div>
        </div>

        {/* Address */}
        {walletAddress && (
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-neutral-900 space-y-2">
            <div className="text-[9px] font-mono text-gray-500 uppercase">Wallet Address</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-cyan-400 break-all">{walletAddress}</code>
              <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10 transition">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            <a
              href={`https://polygonscan.com/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300"
            >
              View on Polygonscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Balances */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-yellow-500/20 bg-neutral-900">
            <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">OGUN Balance</div>
            <div className="text-2xl font-mono font-bold text-yellow-400">
              {ogunBalance ? Number(ogunBalance).toFixed(2) : '0.00'}
            </div>
            <div className="text-[9px] font-mono text-gray-600 mt-1">SoundChain Utility Token</div>
          </div>
          <div className="p-4 rounded-xl border border-purple-500/20 bg-neutral-900">
            <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">POL Balance</div>
            <div className="text-2xl font-mono font-bold text-purple-400">
              {polBalance ? Number(polBalance).toFixed(4) : '0.0000'}
            </div>
            <div className="text-[9px] font-mono text-gray-600 mt-1">Polygon Native Token</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://polygonscan.com/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-neutral-900 hover:bg-neutral-800 transition"
          >
            <ArrowUpRight className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-mono text-white">Transactions</div>
              <div className="text-[9px] font-mono text-gray-500">View on Polygonscan</div>
            </div>
          </a>
          <a
            href={`https://polygonscan.com/token/0x45f1af89486aeec2da0b06340cd9cd3bd741a15c?a=${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-neutral-900 hover:bg-neutral-800 transition"
          >
            <Coins className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-sm font-mono text-white">OGUN History</div>
              <div className="text-[9px] font-mono text-gray-500">Token transfers</div>
            </div>
          </a>
        </div>

        {/* Security info */}
        <div className="p-4 rounded-xl border border-white/5 bg-neutral-900/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-mono text-gray-400">
            <Shield className="w-4 h-4 text-green-400" /> Wallet Security
          </div>
          <div className="text-[10px] font-mono text-gray-600 leading-relaxed">
            Your wallet is secured by your login method (Magic OAuth or HD wallet).
            Private keys are never stored on SoundChain servers. All transactions
            require your signature. 0.05% platform fee on all transfers goes to the
            SoundChain Treasury Gnosis Safe for ecosystem development.
          </div>
        </div>
      </div>
    </div>
  )
}

;(WalletPage as any).getLayout = (page: ReactElement) => page
