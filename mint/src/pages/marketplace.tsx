import Head from 'next/head'
import Link from 'next/link'

export default function Marketplace() {
  return (
    <>
      <Head>
        <title>Marketplace · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <Link href="/" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to home
        </Link>
        <h1 className="text-4xl font-extrabold mb-4">Marketplace</h1>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Phase 3 (live listings + buy flow) ports from soundchain.io next. The
          contracts are already deployed and battle-tested — this app just hosts
          the new UI without the legacy wallet baggage.
        </p>
        <div className="rounded-2xl border border-mint-500/20 bg-mint-500/5 p-6">
          <div className="text-xs uppercase tracking-widest text-mint-300 mb-2">Status</div>
          <p className="text-sm text-gray-300">
            Shell live. Listings ship in Phase 3 (marketplace + auction port). Until
            then, list/buy continues to work on{' '}
            <a href="https://soundchain.io" className="text-mint-300 hover:underline">
              soundchain.io
            </a>
            .
          </p>
        </div>
      </main>
    </>
  )
}
