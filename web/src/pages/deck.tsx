/**
 * /deck — DECK MAP: the SoundChain Starship station map.
 *
 * Fable5 spec served verbatim (public/deck-map.html — the approved 3D
 * station: OGUN reactor core, spine, rotating habitation ring, solar wings,
 * every nav pill as a physical module, Arena as the detached stadium torus,
 * shuttle traffic on approach). Patched for production: single-finger orbit
 * + two-finger PINCH ZOOM (mobile first-class), ENTER buttons route to the
 * real pages ({handle} resolved from the signed-in profile via query param,
 * /login fallback when signed out).
 *
 * Served in an iframe so the approved spec stays pixel-identical; the chrome
 * (DexNavBar + pills) stays ours.
 */

import { ReactElement } from 'react'
import Head from 'next/head'
import { DexNavBar } from 'components/DexNavBar'
import MainPillNav from 'components/MainPillNav'
import { useMe } from 'hooks/useMe'

export default function DeckMapPage() {
  const me = useMe()
  const handle = me?.profile?.userHandle || ''

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Head>
        <title>Deck Map — SoundChain Starship</title>
        <meta name="description" content="Fly the SoundChain Starship — every capsule is a deck. Tap a module, enter its page." />
      </Head>
      <DexNavBar />
      <MainPillNav active="deck" />
      {/* the station — fills everything below the chrome */}
      <iframe
        src={`/deck-map.html${handle ? `?handle=${encodeURIComponent(handle)}` : ''}`}
        title="SoundChain Starship — Deck Map"
        className="flex-1 w-full border-0"
        style={{ minHeight: 'calc(100vh - 140px)' }}
        allow="fullscreen"
      />
    </div>
  )
}

// Standalone chrome — same pattern as /nodes
;(DeckMapPage as any).getLayout = (page: ReactElement) => page
