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

          <p className="text-sm text-arena-muted-l dark:text-arena-muted-d leading-relaxed">
            Real-money sports picks are paused while we focus on real stats, music
            streaming, and on-platform utility. Free-to-play fantasy + 1v1 console
            challenges + the live cross-sport scoreboard are still live.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <PillButton href="/live" variant="primary">
              LIVE SCOREBOARD →
            </PillButton>
            <PillButton href="/" variant="secondary">
              BACK TO ARENA
            </PillButton>
          </div>

          <p className="text-[10px] font-mono text-arena-muted-l dark:text-arena-muted-d tracking-wider pt-4">
            Streaming rewards · SCID royalties · OGUN utility — uninterrupted on soundchain.io.
          </p>
        </div>
      </ArenaShell>
    </>
  )
}
