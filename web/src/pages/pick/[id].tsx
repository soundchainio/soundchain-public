/**
 * /pick/[id] — Share landing page paused alongside Arena Picks (May 2, 2026).
 *
 * Original SSR landing + dynamic OG meta is preserved in
 * /Users/soundchain/backup/arena-picks-takedown-2026-05-02/. Crawlers + browsers
 * land on a paused notice that redirects to /arena. The OG image route still
 * returns a clean "paused" thumbnail so already-shared external links don't 404.
 */
import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { config } from 'config'

export default function PickSharePagePaused() {
  const router = useRouter()
  useEffect(() => {
    const t = setTimeout(() => router.replace('/arena'), 800)
    return () => clearTimeout(t)
  }, [router])

  const origin = config.domainUrl || 'https://soundchain.io'
  const ogImage = `${origin}/api/og/pick/paused`
  const title = 'Arena Picks is paused · SoundChain'
  const description = 'Sports picks are paused. Fantasy leagues and friendly 1v1 challenges are live for fun on SoundChain Arena.'

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SoundChain Arena" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <meta httpEquiv="refresh" content={`0;url=${origin}/arena`} />
      </Head>

      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
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
          <h1 className="text-2xl font-black">Arena Picks is paused</h1>
          <p className="text-sm text-gray-400">{description}</p>
          <a
            href="/arena"
            className="inline-block px-8 py-3 rounded-full font-bold text-sm text-white mt-2"
            style={{
              background: 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)',
              boxShadow: '0 0 32px rgba(168,85,247,0.35)',
            }}
          >
            OPEN ARENA →
          </a>
        </div>
      </div>
    </>
  )
}
