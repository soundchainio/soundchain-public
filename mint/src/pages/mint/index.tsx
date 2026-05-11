/**
 * Mint landing — accept an SCid, route to /mint/<scid>.
 */
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { isValidScid, parseScid } from '@soundchain/scid'

export default function MintLanding() {
  const router = useRouter()
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
          Paste an SCid from your track page on soundchain.io. The forge will
          fetch metadata, mint editions on Polygon, and notify SC's catalog.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-mint-300 mb-2 block">
              SCid
            </span>
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
                  <div className="text-white/60">
                    chain: {parsed.chainCode} · edition: {parsed.edition} · seq: {parsed.sequence}
                  </div>
                </div>
              ) : (
                <div className="text-red-400">
                  ✗ invalid — expected SC-POL-XXXX-XXXXXX
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!valid}
            onClick={() => valid && router.push(`/mint/${scidInput}`)}
            className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-mint-500 to-forge-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Continue to mint
          </button>
        </div>
      </main>
    </>
  )
}
