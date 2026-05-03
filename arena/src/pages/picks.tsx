/**
 * /picks — Paused for compliance review.
 *
 * Real-money P2P sports wagering was paused platform-wide on May 2, 2026 (commit
 * `472f617`) to keep SoundChain's regulatory posture aligned with its core music +
 * utility narrative. Original sportsbook UI + lib/arena/picks/* code preserved at
 * /Users/soundchain/backup/arena-picks-takedown-2026-05-02/ for revival under a
 * compliant framework if/when the regulatory window opens.
 */
import Head from 'next/head'
import { ArenaShell } from '@/components/ArenaShell'
import { PillButton } from '@/components/PillButton'

export default function ArenaPicksPaused() {
  return (
    <>
      <Head>
        <title>Picks · Paused · SoundChain Arena</title>
        <meta name="robots" content="noindex" />
        <meta
          name="description"
          content="Arena Picks is paused. Music streaming, SCID royalties, fantasy + 1v1 challenges continue uninterrupted."
        />
      </Head>

      <ArenaShell>
        <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
          <div className="text-xs font-black tracking-[0.3em] arena-hologram-text">
            SOUNDCHAIN ARENA
          </div>

          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            Arena Picks is paused
          </h1>

          <p className="text-sm text-gray-400 leading-relaxed">
            Real-money sports picks are paused while we focus on music streaming, SCID
            royalties, and on-platform rewards. Fantasy leagues and friendly 1v1
            console challenges are still live for fun.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <PillButton href="/fantasy" variant="primary">
              FANTASY LEAGUES →
            </PillButton>
            <PillButton href="/" variant="secondary">
              BACK TO ARENA
            </PillButton>
          </div>

          <p className="text-[10px] font-mono text-gray-600 tracking-wider pt-4">
            Streaming rewards · SCID royalties · OGUN utility — uninterrupted on
            soundchain.io.
          </p>
        </div>
      </ArenaShell>
    </>
  )
}
