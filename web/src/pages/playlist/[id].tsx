/**
 * /playlist/[id] — share/OG route for a SoundChain playlist.
 *
 * Mirrors /posts/[id]: a link-preview bot gets rich Open Graph / Twitter meta
 * (cover-art card + a player when the first track is a YouTube embed) so shared
 * playlist links render a cover-art bubble in iMessage / X / WhatsApp / Discord
 * instead of a bare "Click to Load Preview". Humans are redirected straight to
 * the real player at /dex/playlist/<id>. OG is built from Mongo directly
 * (api.soundchain.io is dead), keyed on the anvil domain via config.domainUrl.
 */
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { config } from 'config'

const BOT_USER_AGENTS = [
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot', 'WhatsApp',
  'Slackbot', 'TelegramBot', 'Discordbot', 'iMessageLinkPreview', 'Googlebot',
  'bingbot', 'applebot', 'Pinterest', 'Snapchat', 'Embedly',
]
const isBot = (ua?: string) => !!ua && BOT_USER_AGENTS.some(b => ua.toLowerCase().includes(b.toLowerCase()))

// IPFS → HTTP gateway so crawlers can fetch the cover art.
function httpImage(url: string | null | undefined, origin: string): string {
  if (!url) return `${origin}/soundchain-meta-logo.png`
  if (url.startsWith('ipfs://')) return `https://dweb.link/ipfs/${url.replace('ipfs://', '')}`
  if (url.startsWith('/ipfs/')) return `https://dweb.link${url}`
  return url
}

const ytId = (url?: string | null): string | null => {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface OgData {
  title: string
  description: string
  image: string
  url: string
  playerEmbed?: string | null
}

export interface PlaylistShareProps {
  id: string
  isBot: boolean
  og?: OgData
}

export const getServerSideProps: GetServerSideProps<PlaylistShareProps> = async (context) => {
  const id = context.params?.id as string
  if (!id) return { notFound: true }

  // Humans go straight to the real player — never block on the DB.
  if (!isBot(context.req.headers['user-agent'])) {
    return { redirect: { destination: `/dex/playlist/${id}`, permanent: false } }
  }

  const ORIGIN = config.domainUrl || 'https://soundchain.io'
  let og: OgData = {
    title: 'Playlist | SoundChain',
    description: 'A playlist on SoundChain',
    image: `${ORIGIN}/soundchain-meta-logo.png`,
    url: `${ORIGIN}/playlist/${id}`,
  }
  try {
    const { ObjectId } = await import('mongodb')
    const { default: clientPromise } = await import('lib/mongodb')
    const db = (await clientPromise).db('soundchain')
    const oid = new ObjectId(id)
    const pl = await db.collection('playlists').findOne({ _id: oid })
    if (pl) {
      const links = await db.collection('playlisttracks').find({ playlistId: oid }).sort({ position: 1 }).toArray()
      const first = links[0]
      const firstYt = ytId(first?.externalUrl || first?.url)
      const cover = pl.artworkUrl || pl.coverImage || first?.artworkUrl || (firstYt ? `https://i.ytimg.com/vi/${firstYt}/hqdefault.jpg` : null)
      og = {
        title: `${pl.title || 'Playlist'} — playlist on SoundChain`,
        description: `${links.length} song${links.length === 1 ? '' : 's'}${pl.description ? ` · ${String(pl.description).slice(0, 120)}` : ' · built on SoundChain'}`,
        image: httpImage(cover, ORIGIN),
        url: `${ORIGIN}/playlist/${id}`,
        playerEmbed: firstYt ? `https://www.youtube.com/embed/${firstYt}` : null,
      }
    }
  } catch (e) {
    console.error('[playlist/[id]] OG build failed:', (e as any)?.message)
  }
  // Hard CDN-cache the preview; humans redirect above so staleness never hits the app.
  context.res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return { props: { id, isBot: true, og } }
}

export default function PlaylistSharePage({ id, isBot: bot, og }: PlaylistShareProps) {
  if (!bot || !og) return null
  return (
    <>
      <Head>
        <title>{og.title}</title>
        <meta name="description" content={og.description} />
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={og.url} />
        <meta property="og:site_name" content="SoundChain" />
        <meta property="og:type" content={og.playerEmbed ? 'music.playlist' : 'website'} />
        {og.playerEmbed && (
          <>
            <meta property="og:video" content={og.playerEmbed} />
            <meta property="og:video:secure_url" content={og.playerEmbed} />
            <meta property="og:video:type" content="text/html" />
            <meta property="og:video:width" content="480" />
            <meta property="og:video:height" content="270" />
          </>
        )}
        <meta name="twitter:card" content={og.playerEmbed ? 'player' : 'summary_large_image'} />
        <meta name="twitter:title" content={og.title} />
        <meta name="twitter:description" content={og.description} />
        <meta name="twitter:image" content={og.image} />
        <meta name="twitter:site" content="@SoundChainFM" />
        {og.playerEmbed && (
          <>
            <meta name="twitter:player" content={og.playerEmbed} />
            <meta name="twitter:player:width" content="480" />
            <meta name="twitter:player:height" content="270" />
          </>
        )}
        <link rel="canonical" href={og.url} />
      </Head>
      {/* Real browsers that land on this CDN-cached page bounce to the live player;
          crawlers don't run JS so they keep reading the OG tags above. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var b=/bot|crawl|spider|facebookexternalhit|Twitterbot|Slackbot|TelegramBot|Discordbot|WhatsApp|LinkedInBot|Embedly|Pinterest|Snapchat|Googlebot|bingbot|applebot|iMessageLinkPreview/i;if(!b.test(navigator.userAgent)){location.replace(${JSON.stringify('/dex/playlist/' + id)})}}catch(e){}`,
        }}
      />
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          {og.image && <img src={og.image} alt={og.title} className="w-64 h-64 mx-auto rounded-lg shadow-lg mb-6 object-cover" />}
          <h1 className="text-2xl font-bold text-white mb-2">{og.title}</h1>
          <p className="text-gray-400 mb-4">{og.description}</p>
          <p className="text-cyan-400">Opening on SoundChain…</p>
        </div>
      </div>
    </>
  )
}
