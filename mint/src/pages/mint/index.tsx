import Head from 'next/head'
import Link from 'next/link'
import { isValidScid, parseScid } from '@soundchain/scid'
import { useState } from 'react'

export default function MintPage() {
  const [scidInput, setScidInput] = useState('')
  const parsed = parseScid(scidInput)
  const valid = isValidScid(scidInput)

  return (
    <>
      <Head>
        <title>Mint NFT · SoundChain Mint</title>
      </Head>
      <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
        <Link href="/" className="text-xs text-gray-500 hover:text-mint-300 inline-block mb-8">
          ← back to home
        </Link>
        <h1 className="text-4xl font-extrabold mb-4">Mint an edition</h1>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Phase 3 ports the full mint flow (CreateModal lift from <code className="bg-white/5 px-1 rounded">web/src/components/modals/CreateModal.tsx</code>).
          This shell proves the shared <code className="bg-white/5 px-1 rounded">@soundchain/scid</code> package is wired correctly.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-mint-300 mb-2 block">SCid (paste from soundchain.io)</span>
            <input
              type="text"
              value={scidInput}
              onChange={(e) => setScidInput(e.target.value.toUpperCase())}
              placeholder="SC-POL-D038-2600003"
              className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-mint-500/50 text-white font-mono outline-none transition-colors"
            />
          </label>

          {scidInput && (
            <div className="text-sm font-mono">
              {valid && parsed ? (
                <div className="text-mint-300 space-y-1">
                  <div>✓ valid SCid</div>
                  <div className="text-white/60">chain: {parsed.chainCode} · edition: {parsed.edition} · seq: {parsed.sequence}</div>
                </div>
              ) : (
                <div className="text-red-400">✗ invalid format — expected SC-POL-XXXX-XXXXXX</div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Real mint flow ships in Phase 3. For now, list your tracks for mint on
            <a href="https://soundchain.io" className="text-mint-300 hover:underline mx-1">soundchain.io</a>
            — the dual-deploy keeps both options open during the migration window.
          </p>
        </div>
      </main>
    </>
  )
}
