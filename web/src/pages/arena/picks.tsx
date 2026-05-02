/**
 * /arena/picks — Paused for compliance review.
 *
 * Real-money P2P sports wagering was paused platform-wide on May 2, 2026 to keep
 * SoundChain's regulatory posture aligned with its core music + utility narrative.
 * Original 1426-line sportsbook UI + lib/arena/picks/* code is preserved verbatim
 * in /Users/soundchain/backup/arena-picks-takedown-2026-05-02/ for revival under
 * a compliant framework if/when the regulatory window opens.
 */
import Head from 'next/head'
import Link from 'next/link'

export default function ArenaPicksPaused() {
  return (
    <>
      <Head>
        <title>Arena Picks · Paused · SoundChain</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content="Arena Picks is paused. Music streaming, SCID royalties, and rewards continue uninterrupted." />
      </Head>

      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div
            className="text-xs font-black tracking-[0.3em]"
            style={{
              background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            SOUNDCHAIN ARENA
          </div>

          <h1 className="text-2xl font-black leading-tight">Arena Picks is paused</h1>

          <p className="text-sm text-gray-400 leading-relaxed">
            Real-money sports picks are paused while we focus on music streaming, SCID royalties, and on-platform rewards. Fantasy leagues and friendly 1v1 challenges are still live for fun.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/arena/fantasy"
              className="block w-full py-3 rounded-full font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
                boxShadow: '0 0 32px rgba(168,85,247,0.35)',
              }}
            >
              FANTASY LEAGUES →
            </Link>
            <Link
              href="/arena"
              className="block w-full py-3 rounded-full font-bold text-sm text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10 transition"
            >
              BACK TO ARENA
            </Link>
          </div>

          <p className="text-[10px] font-mono text-gray-600 tracking-wider pt-4">
            Streaming rewards · SCID royalties · OGUN utility — uninterrupted.
          </p>
        </div>
      </div>
    </>
  )
}
