import Head from 'next/head'
import Link from 'next/link'
import { useAccount, useBalance, useChainId } from 'wagmi'

export default function Wallet() {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const { data: nativeBalance } = useBalance({ address })

  return (
    <>
      <Head>
        <title>Wallet · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
        <Link href="/" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to home
        </Link>
        <h1 className="text-4xl font-extrabold mb-4">Wallet</h1>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Aggregated view of your wallets, balances, NFTs, and stakes. Phase 3+
          fills this in — the shell here proves the wagmi v2 + Reown wiring works.
        </p>

        {!isConnected ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-sm text-gray-300">Connect your wallet to see balances and NFTs.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-mint-500/30 bg-mint-500/5 p-6 space-y-3 font-mono text-sm">
            <div>
              <span className="text-mint-300">address:</span>{' '}
              <span className="text-white">{address}</span>
            </div>
            <div>
              <span className="text-mint-300">chainId:</span>{' '}
              <span className="text-white">{chainId}</span>
            </div>
            <div>
              <span className="text-mint-300">connector:</span>{' '}
              <span className="text-white">{connector?.name ?? 'unknown'}</span>
            </div>
            {nativeBalance && (
              <div>
                <span className="text-mint-300">native balance:</span>{' '}
                <span className="text-white">
                  {nativeBalance.formatted} {nativeBalance.symbol}
                </span>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
