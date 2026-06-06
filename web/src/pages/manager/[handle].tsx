import { ReactElement, useState, useMemo, useEffect, useRef } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ChevronLeft, Calendar, Users, Briefcase, Music, ExternalLink, DollarSign, Plane, Hotel, Coffee, Sliders, Globe, Share2, Check } from 'lucide-react'
import { config } from 'config'
import { CustomLayout } from 'pages/_app'
import { createApolloClient } from 'lib/apollo'
import {
  ProfileByHandleDocument,
  ProfileByHandleQuery,
  SortTrackField,
  SortOrder,
} from 'lib/graphql'
import { useProfileByHandle as useProfileByHandleQuery } from 'hooks/useProfileByHandleDirect'  // Phase 7e — Vercel-direct
import { useGroupedTracks as useGroupedTracksQuery } from 'hooks/useGroupedTracksDirect'  // Phase 7e — Vercel-direct
import { useMe } from 'hooks/useMe'
import { Logo } from 'icons/Logo'
import { ManagerGreeting } from 'components/manager/ManagerGreeting'
import { ManagerContactForm } from 'components/manager/ManagerContactForm'
import { ManagerConfig, loadManagerConfig, fetchManagerConfig, ManagerConfigData, saveManagerConfig } from 'components/manager/ManagerConfig'
import { ManagerCoverUploader } from 'components/manager/ManagerCoverUploader'
import { ManagerInbox } from 'components/manager/ManagerInbox'
import { ManagerBioEditor } from 'components/manager/ManagerBioEditor'
import { ManagerReputation } from 'components/manager/ManagerReputation'
import { ManagerFlyers } from 'components/manager/ManagerFlyers'
import { ManagerEscrowViewer } from 'components/manager/ManagerEscrowViewer'
import { ManagerLanguageGate } from 'components/manager/ManagerLanguageGate'
import { ManagerBookingEscrow } from 'components/manager/ManagerBookingEscrow'
import { ManagerBankVault } from 'components/manager/ManagerBankVault'
import { detectVisitorLang, t, MANAGER_LOCALES, localeFor } from 'lib/managerI18n'

// ─── SSR for OG Tags ─────────────────────────────────────────────────

interface OgData {
  title: string
  description: string
  image: string
  url: string
}

interface ManagerPageProps {
  ogData: OgData | null
  handle: string
  isBot: boolean
}

// Social/link-preview crawlers — they read the SERVER html only (no JS). The full
// manager app is client-rendered (Apollo/auth providers don't render server-side),
// so a bot's #__next comes back empty → no og tags → bare-logo share card. We detect
// these and serve them an OG-only document up front (mirrors the profile page).
const BOT_PATTERNS = [
  'discordbot', 'twitterbot', 'facebookexternalhit', 'linkedinbot', 'slackbot',
  'telegrambot', 'whatsapp', 'googlebot', 'bingbot', 'applebot', 'redditbot',
  'pinterest', 'vkshare', 'embedly', 'quora link preview', 'skypeuripreview',
  'iframely', 'opengraph',
]

export const getServerSideProps: GetServerSideProps<ManagerPageProps> = async (context) => {
  const handle = context.params?.handle as string
  const ua = (context.req.headers['user-agent'] || '').toLowerCase()
  const isBot = BOT_PATTERNS.some(b => ua.includes(b))
  if (!handle) return { notFound: true }

  try {
    // Fetch the profile Vercel-direct from Mongo — Apollo/api.soundchain.io is DEAD,
    // so the old apolloClient.query threw → ogData null → the manager share card fell
    // back to the bare logo. Dynamic import so the mongodb driver is only pulled at
    // request time on the server, never during build-time page-data collection.
    const { default: clientPromise } = await import('lib/mongodb')
    const { ObjectId } = await import('mongodb')
    const mongo = await clientPromise
    const db = mongo.db('soundchain')
    const proj = { projection: { displayName: 1, userHandle: 1, profilePicture: 1, coverPicture: 1, bio: 1 } }
    let profile: any = await db.collection('profiles').findOne({ userHandle: { $regex: `^${handle}$`, $options: 'i' } }, proj)
    if (!profile) {
      // The handle may live on users.handle (profile.userHandle can be empty) → resolve via profileId.
      const user: any = await db.collection('users').findOne({ handle: { $regex: `^${handle}$`, $options: 'i' } }, { projection: { profileId: 1 } })
      if (user?.profileId) profile = await db.collection('profiles').findOne({ _id: new ObjectId(user.profileId) }, proj)
    }
    // NEVER 404 the page on an OG-lookup miss — render it; the page fetches the profile client-side.
    if (!profile) return { props: { ogData: null, handle, isBot } }

    // The pro's uploaded manager hero cover is the share-card image (the bubble that
    // renders when the /manager link is dropped in a DM / iMessage / X).
    let heroImageUrl = ''
    try {
      const cfgDoc = await mongo.db('soundchain').collection('managerConfigs').findOne({ profileId: profile._id })
      heroImageUrl = (cfgDoc?.heroImageUrl as string) || ''
    } catch {}

    const name = profile.displayName || profile.userHandle || handle
    const fallbackLogo = `${config.domainUrl || 'https://soundchain.io'}/soundchain-meta-logo.png`
    const ogData: OgData = {
      title: `${name} | Artist Manager`,
      description: profile.bio
        ? profile.bio.substring(0, 160)
        : `Connect with ${name} on SoundChain. Book shows, propose collaborations, and make business inquiries.`,
      // Wide manager banner first → cover → square avatar → logo, so the card is
      // always a real image and never a bare logo.
      image: heroImageUrl || profile.coverPicture || profile.profilePicture || fallbackLogo,
      url: `/manager/${handle}`,
    }

    return { props: { ogData, handle, isBot } }
  } catch {
    return { props: { ogData: null, handle, isBot } }
  }
}

// ─── Social Media Links ──────────────────────────────────────────────

const SOCIAL_ICONS: Record<string, { label: string; urlPrefix: string }> = {
  instagram: { label: 'Instagram', urlPrefix: 'https://instagram.com/' },
  twitter: { label: 'Twitter/X', urlPrefix: 'https://twitter.com/' },
  spotify: { label: 'Spotify', urlPrefix: '' },
  soundcloud: { label: 'SoundCloud', urlPrefix: 'https://soundcloud.com/' },
  bandcamp: { label: 'Bandcamp', urlPrefix: '' },
  discord: { label: 'Discord', urlPrefix: '' },
  telegram: { label: 'Telegram', urlPrefix: 'https://t.me/' },
  linktree: { label: 'Linktree', urlPrefix: '' },
  facebook: { label: 'Facebook', urlPrefix: 'https://facebook.com/' },
}

function getSocialUrl(platform: string, value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  const info = SOCIAL_ICONS[platform]
  if (info?.urlPrefix) return `${info.urlPrefix}${value}`
  return value
}

// ─── Page Component ──────────────────────────────────────────────────

// One rider line (travel / hotel / hospitality / technical) for the booker.
function RiderRow({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-[13px] text-gray-300 whitespace-pre-wrap break-words">{value}</p>
      </div>
    </div>
  )
}

export default function ManagerPage({ ogData, handle, isBot }: ManagerPageProps) {
  // Crawler path: serve an OG-only document BEFORE any client-only hooks run, so the
  // share-card bot gets the hero-cover image (the full app's #__next is empty SSR).
  if (isBot) {
    const domain = config.domainUrl || 'https://soundchain.io'
    const img = ogData?.image || `${domain}/soundchain-meta-logo.png`
    const title = ogData?.title || `${handle} | Artist Manager`
    const desc = ogData?.description || `Connect with ${handle} on SoundChain`
    const url = `${domain}/manager/${handle}`
    return (
      <>
        <Head>
          <title>{title}</title>
          <meta name="description" content={desc} />
          <meta property="og:type" content="profile" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={desc} />
          <meta property="og:image" content={img} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:url" content={url} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={desc} />
          <meta name="twitter:image" content={img} />
          <link
            rel="alternate"
            type="application/json+oembed"
            href={`${domain}/api/oembed?url=${encodeURIComponent(url)}`}
            title={title}
          />
        </Head>
        <div style={{ padding: 24, fontFamily: 'sans-serif', background: '#000', color: '#fff' }}>
          <h1>{title}</h1>
          <p>{desc}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={title} style={{ maxWidth: '480px', width: '100%', borderRadius: 12 }} />
          <p><a href={url} style={{ color: '#22d3ee' }}>Open {handle}&apos;s manager on SoundChain →</a></p>
        </div>
      </>
    )
  }

  const router = useRouter()
  const pageHandle = (router.query.handle as string) || handle

  const { data: profileData, loading: profileLoading } = useProfileByHandleQuery({
    handle: pageHandle,
    skip: !pageHandle,
  })
  const profile = profileData?.profileByHandle

  const { data: tracksData } = useGroupedTracksQuery({
    variables: {
      filter: { profileId: profile?.id },
      page: { first: 20 },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
    },
    skip: !profile?.id,
  })
  const tracks = tracksData?.groupedTracks?.nodes || []

  const me = useMe()
  const isOwner = !!(me?.profile?.id && profile?.id && me.profile.id === profile.id)

  const [activeForm, setActiveForm] = useState<'booking' | 'collab' | 'business' | null>(null)
  const [copied, setCopied] = useState(false)

  // The contact/inquiry form renders far below the "Contact … send an inquiry" bar
  // (after the greeting, escrow, reputation, flyers). On mobile, tapping the bar
  // opened the form off-screen → "nothing happens". Scroll it into view on open.
  const formRef = useRef<HTMLDivElement>(null)
  const openForm = (type: 'booking' | 'collab' | 'business') => {
    setActiveForm(type)
    requestAnimationFrame(() => {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    })
  }

  // Polyglot: the agent talks to the visitor in THEIR language. Start at 'en' for
  // SSR/hydration parity. On mount: use the remembered choice if any; otherwise
  // pre-detect from the browser and show the language welcome gate so the visitor
  // confirms before anything else — once chosen, the agent speaks + types in it.
  const [viewerLang, setViewerLang] = useState<string>('en')
  const [showLangGate, setShowLangGate] = useState(false)
  useEffect(() => {
    let saved = ''
    try { saved = localStorage.getItem('manager_lang') || '' } catch {}
    if (saved) {
      setViewerLang(saved)
    } else {
      setViewerLang(detectVisitorLang())
      setShowLangGate(true)
    }
  }, [])
  const chooseLang = (code: string) => {
    setViewerLang(code)
    try { localStorage.setItem('manager_lang', code) } catch {}
    setShowLangGate(false)
  }
  const [managerConfig, setManagerConfig] = useState<ManagerConfigData>(() => {
    if (typeof window === 'undefined' || !profile?.id) return loadManagerConfig('')
    return loadManagerConfig(profile.id)
  })

  // Load config: localStorage gives the owner an instant render; the SERVER copy
  // is the source of truth, so VISITORS (and the agent speaking on the pro's
  // behalf) see the greeting/voice/rates/rider/terms the pro actually set.
  useEffect(() => {
    if (!profile?.id || typeof window === 'undefined') return
    setManagerConfig(loadManagerConfig(profile.id))
    let cancelled = false
    fetchManagerConfig(profile.id).then(server => {
      if (!cancelled && server) setManagerConfig(server)
    })
    return () => { cancelled = true }
  }, [profile?.id])

  const displayName = profile?.displayName || profile?.userHandle || pageHandle
  const latestTrack = tracks[0]
  const vis = managerConfig.sectionsVisible
  // Manager-specific banner first, then the SC profile cover as a sensible default.
  const heroSrc = managerConfig.heroImageUrl || profile?.coverPicture || ''

  // Booking Details — derived flags so the card only shows when the pro set terms.
  const mc = managerConfig
  const hasServices = mc.services.length > 0
  const hasRider = !!(mc.rider.travel || mc.rider.accommodation || mc.rider.hospitality || mc.rider.technical)
  const hasPayment = !!(mc.paymentTerms.depositSchedule || mc.paymentTerms.methods || mc.paymentTerms.currency || mc.paymentTerms.cancellation)
  const showBookingDetails = hasServices || hasRider || hasPayment

  const socialEntries = useMemo(() => {
    const sm = profile?.socialMedias
    if (!sm) return []
    // Only known social platforms — keeps Mongo internals (_id, __typename, etc.)
    // out of the Connect row (they rendered as broken pills → about:blank).
    return Object.entries(sm).filter(([k, v]) => SOCIAL_ICONS[k] && typeof v === 'string' && v)
  }, [profile?.socialMedias])

  const domainUrl = config.domainUrl || 'https://soundchain.io'
  const shareUrl = `${domainUrl}/manager/${pageHandle}`

  // Share the manager page — native OS share sheet on mobile (Frank's device),
  // clipboard copy with inline "Copied!" feedback everywhere else.
  const handleShare = async () => {
    const shareData = {
      title: `${displayName} | Artist Manager`,
      text: `Book ${displayName} on SoundChain`,
      url: shareUrl,
    }
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share(shareData)
        return
      } catch {
        // user dismissed the sheet (or it failed) → fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // OG/share meta — MUST render in EVERY return path (incl. loading/not-found).
  // Link-preview bots (iMessage/X) read the SERVER html, and `profile` is fetched
  // client-side — so gating the Head behind `profile` left the share card image-less
  // (the spinner state served no og:image). ogData comes from getServerSideProps, so
  // it's always available server-side.
  const ogHead = (
    <Head>
      <title>{ogData?.title || `${pageHandle} | Artist Manager`}</title>
      <meta name="description" content={ogData?.description || `Connect with ${pageHandle} on SoundChain`} />
      <meta property="og:type" content="profile" />
      <meta property="og:title" content={ogData?.title || `${pageHandle} | Artist Manager`} />
      <meta property="og:description" content={ogData?.description || `Connect with ${pageHandle} on SoundChain`} />
      <meta property="og:image" content={ogData?.image || `${domainUrl}/soundchain-meta-logo.png`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={`${domainUrl}/manager/${pageHandle}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogData?.title || `${pageHandle} | Artist Manager`} />
      <meta name="twitter:description" content={ogData?.description || `Connect with ${pageHandle} on SoundChain`} />
      <meta name="twitter:image" content={ogData?.image || `${domainUrl}/soundchain-meta-logo.png`} />
    </Head>
  )

  // ─── Loading / Error States ──────────────────────────────────────

  if (profileLoading) {
    return (
      <>
        {ogHead}
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        {ogHead}
        <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Artist Not Found</h1>
          <p className="text-gray-500 text-sm mb-4">The profile &quot;{pageHandle}&quot; doesn&apos;t exist.</p>
          <Link href="/" className="text-cyan-400 text-sm hover:text-cyan-300">
            Go to SoundChain
          </Link>
        </div>
      </div>
      </>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <>
      {ogHead}

      <div className="min-h-screen bg-black text-white">
        {/* Language welcome gate — first touch: pick the language the agent speaks */}
        {showLangGate && <ManagerLanguageGate current={viewerLang} onSelect={chooseLang} />}

        {/* ─── Sticky Nav ───────────────────────────────────────────── */}
        <nav className="backdrop-blur-xl bg-black/90 border-b border-cyan-500/20 px-4 py-2.5 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (typeof window !== 'undefined' && window.history.length > 1) router.back(); else router.push('/') }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <Link href="/" className="flex items-center gap-2">
                <Logo className="h-7 w-7" />
                <span className="text-sm font-bold bg-gradient-to-r from-orange-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
                  SoundChain
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleShare}
                title="Share this manager page"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-500/70 hidden sm:inline">Artist Manager</span>
            </div>
          </div>
        </nav>

        {/* ─── Hero Section ─────────────────────────────────────────── */}
        {/* Width-capped, centered banner: full-bleed on mobile, a polished card
            on widescreen (never an edge-to-edge stretched band). object-cover +
            object-center keeps any uploaded image crisp and undistorted. */}
        <div className="w-full bg-black px-3 sm:px-4 pt-3">
          {/* Cover as a floating digital card/bubble — rounded all corners, glowing cyan frame */}
          <div className="relative max-w-7xl mx-auto h-[40vh] min-h-[240px] max-h-[440px] overflow-hidden rounded-[28px] border border-cyan-500/30 shadow-2xl shadow-cyan-500/15 ring-1 ring-white/10">
            {heroSrc ? (
              <img
                src={heroSrc}
                alt={`${displayName} cover`}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900/80 via-cyan-900/50 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Owner-only cover uploader — CTA in the empty space, edit pill once set */}
            {isOwner && profile.id && (
              <ManagerCoverUploader
                currentUrl={managerConfig.heroImageUrl}
                hasImage={!!heroSrc}
                onUploaded={(url) => {
                  const next = { ...managerConfig, heroImageUrl: url }
                  setManagerConfig(next)
                  saveManagerConfig(profile.id, next)
                }}
              />
            )}

            {/* Profile Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-purple-900 to-cyan-900 shadow-2xl flex-shrink-0">
                  {profile.profilePicture ? (
                    <img src={profile.profilePicture} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Name + Handle */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-white truncate" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {displayName}
                    </h1>
                    {profile.verified && (
                      <span className="text-cyan-400 text-sm" title="Verified">&#10003;</span>
                    )}
                  </div>
                  <p className="text-cyan-400 text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    @{profile.userHandle || 'user'}
                  </p>
                  {managerConfig.tagline && (
                    <p className="text-gray-300 text-xs mt-0.5 italic" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                      {managerConfig.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio + Stats */}
              {profile.bio && (
                <p className="text-gray-300 text-sm mt-3 max-w-xl line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                {profile.tracksCount ? (
                  <span className="flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    {profile.tracksCount} tracks
                  </span>
                ) : null}
                {profile.followerCount ? (
                  <span>{Number(profile.followerCount).toLocaleString()} followers</span>
                ) : null}
                {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {profile.favoriteGenres.slice(0, 3).map(g => (
                      <span key={g} className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">{g}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking rate / availability */}
              {(managerConfig.bookingRate || managerConfig.availability) && (
                <div className="flex items-center gap-4 mt-2 text-xs">
                  {managerConfig.bookingRate && (
                    <span className="text-green-400">{managerConfig.bookingRate}</span>
                  )}
                  {managerConfig.availability && (
                    <span className="text-gray-400">{managerConfig.availability}</span>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* ─── Content ──────────────────────────────────────────────── */}
        {/* Desktop: 2-column grid so the page fills the width (info cards pair up
            side-by-side); mobile collapses to a single stacked column. */}
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Language — full width, right-aligned */}
          <div className="flex items-center justify-end -mb-2 lg:col-span-2">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={localeFor(viewerLang).code}
                onChange={e => chooseLang(e.target.value)}
                aria-label={t(viewerLang, 'language')}
                className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {MANAGER_LOCALES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Owner: bio editor + inbox. Promoter: a clear "send an inquiry" CTA so a
              visitor landing on a shared manager card instantly knows how to reach out. */}
          {isOwner && profile.id ? (
            <>
              <ManagerBioEditor initialBio={profile.bio || ''} />
              <ManagerInbox />
            </>
          ) : (
            <button
              onClick={() => openForm('booking')}
              className="lg:col-span-2 flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500/90 to-purple-500/90 hover:from-cyan-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all"
            >
              📨 Contact {displayName} — send an inquiry
            </button>
          )}

          {/* Greeting Card */}
          {vis.greeting && (
            <ManagerGreeting
              displayName={displayName}
              bio={profile.bio}
              genres={profile.favoriteGenres}
              latestTrackTitle={latestTrack?.title}
              tracksCount={profile.tracksCount ?? undefined}
              customGreetingText={managerConfig.customGreetingText || undefined}
              customGreetingAudioUrl={managerConfig.customGreetingAudioUrl || undefined}
              isOwner={isOwner}
              selectedVoice={managerConfig.selectedVoice || undefined}
              lang={viewerLang}
              onSaveGreeting={(text) => {
                const next = { ...managerConfig, customGreetingText: text }
                setManagerConfig(next)
                try { localStorage.setItem(`manager_config_${profile.id}`, JSON.stringify(next)) } catch {}
              }}
              onSaveVoice={(voice) => {
                const next = { ...managerConfig, selectedVoice: voice }
                setManagerConfig(next)
                try { localStorage.setItem(`manager_config_${profile.id}`, JSON.stringify(next)) } catch {}
              }}
            />
          )}

          {/* Reputation + on-chain escrow viewer — a promoter's trust signals (pair side-by-side on desktop) */}
          <ManagerReputation
            followerCount={profile.followerCount ?? undefined}
            tracksCount={profile.tracksCount ?? undefined}
            verified={profile.verified}
            completedBookings={(managerConfig as any).completedBookings || 0}
          />
          <ManagerEscrowViewer
            artistName={displayName}
            artistAvatar={profile.profilePicture || undefined}
            payoutAddress={managerConfig.payoutAddress || undefined}
          />

          {/* Booking Details — rates, rider & terms the promoter needs to arrange */}
          {showBookingDetails && (
            <section className="backdrop-blur-xl bg-black/60 border border-cyan-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">{t(viewerLang, 'bookingDetails')}</h2>
                {mc.profession && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">{mc.profession}</span>
                )}
              </div>

              {hasServices && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider">Services &amp; Rates</p>
                  <div className="space-y-1">
                    {mc.services.map((s, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-200">{s.name}{s.note && <span className="text-gray-500 text-xs"> · {s.note}</span>}</span>
                        {s.rate && <span className="text-green-400 font-medium whitespace-nowrap">{s.rate}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasRider && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider">Rider</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {mc.rider.travel && <RiderRow icon={Plane} label="Travel" value={mc.rider.travel} />}
                    {mc.rider.accommodation && <RiderRow icon={Hotel} label="Hotel" value={mc.rider.accommodation} />}
                    {mc.rider.hospitality && <RiderRow icon={Coffee} label="Hospitality" value={mc.rider.hospitality} />}
                    {mc.rider.technical && <RiderRow icon={Sliders} label="Technical" value={mc.rider.technical} />}
                  </div>
                </div>
              )}

              {hasPayment && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider">Payment</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    {mc.paymentTerms.depositSchedule && (
                      <span className="flex items-center gap-1.5 text-gray-300"><DollarSign className="w-3.5 h-3.5 text-green-400" /> {mc.paymentTerms.depositSchedule}</span>
                    )}
                    {mc.paymentTerms.methods && <span className="text-gray-400">Methods: {mc.paymentTerms.methods}</span>}
                    {mc.paymentTerms.currency && <span className="text-gray-400">Currency: {mc.paymentTerms.currency}</span>}
                    {mc.paymentTerms.cancellation && <span className="text-gray-500 w-full text-xs">{mc.paymentTerms.cancellation}</span>}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Latest Tracks */}
          {vis.tracks && tracks.length > 0 && (
            <section className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Collection · NFTs &amp; SCIDs</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {tracks.slice(0, 10).map(track => (
                  <Link
                    key={track.id}
                    href={`/dex/track/${track.id}`}
                    className="flex-shrink-0 w-32 group"
                  >
                    <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-cyan-500/40 transition-colors">
                      {track.artworkUrl ? (
                        <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-cyan-900 flex items-center justify-center">
                          <Music className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white mt-1.5 truncate group-hover:text-cyan-400 transition-colors">
                      {track.title}
                    </p>
                    {track.artist && (
                      <p className="text-[10px] text-gray-500 truncate">{track.artist}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent Events — flyer gallery (owner uploads, promoters see touring history) */}
          <ManagerFlyers
            flyers={(managerConfig as any).flyers || []}
            isOwner={isOwner}
            onChange={(flyers) => {
              const next = { ...managerConfig, flyers } as any
              setManagerConfig(next)
              if (profile.id) saveManagerConfig(profile.id, next)
            }}
          />

          {/* Action Buttons */}
          <div ref={formRef} className="scroll-mt-20" />
          {activeForm ? (
            <>
              <ManagerContactForm
                type={activeForm}
                profileId={profile.id}
                artistName={displayName}
                onClose={() => setActiveForm(null)}
              />
              {/* Booking whitelist escrow — pay the deposit in crypto (BTC·ETH·SOL
                  + 24 tokens), the on-chain deposit locks the date + reveals payout */}
              {activeForm === 'booking' && (
                <ManagerBookingEscrow
                  profileId={profile.id}
                  displayName={displayName}
                  payoutAddress={managerConfig.payoutAddress || undefined}
                  depositHint={managerConfig.paymentTerms.depositSchedule || managerConfig.bookingRate || undefined}
                  lang={viewerLang}
                />
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vis.booking && (
                <button
                  onClick={() => openForm('booking')}
                  className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group"
                >
                  <Calendar className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{t(viewerLang, 'book')}</p>
                    <p className="text-[10px] text-gray-500">{t(viewerLang, 'bookDesc')}</p>
                  </div>
                </button>
              )}
              {vis.collab && (
                <button
                  onClick={() => openForm('collab')}
                  className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
                >
                  <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{t(viewerLang, 'collab')}</p>
                    <p className="text-[10px] text-gray-500">{t(viewerLang, 'collabDesc')}</p>
                  </div>
                </button>
              )}
              {vis.business && (
                <button
                  onClick={() => openForm('business')}
                  className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                >
                  <Briefcase className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{t(viewerLang, 'business')}</p>
                    <p className="text-[10px] text-gray-500">{t(viewerLang, 'businessDesc')}</p>
                  </div>
                </button>
              )}
              <Link
                href={`/users/${pageHandle}`}
                className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all group"
              >
                <Music className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{t(viewerLang, 'profile')}</p>
                  <p className="text-[10px] text-gray-500">{t(viewerLang, 'profileDesc')}</p>
                </div>
              </Link>
            </div>
          )}

          {/* Social Links */}
          {vis.socials && socialEntries.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Connect</h2>
              <div className="flex flex-wrap gap-2">
                {socialEntries.map(([platform, value]) => (
                  <a
                    key={platform}
                    href={getSocialUrl(platform, String(value))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 hover:border-cyan-500/40 text-xs text-gray-300 hover:text-cyan-400 transition-colors"
                  >
                    {SOCIAL_ICONS[platform]?.label || platform}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Follow on SoundChain */}
          <Link
            href={`/users/${pageHandle}`}
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-center text-sm font-semibold text-white hover:opacity-90 transition-opacity lg:col-span-2"
          >
            Follow on SoundChain
          </Link>

          {/* Owner Config Panel */}
          {isOwner && profile.id && (
            <div className="lg:col-span-2 space-y-6">
              <ManagerConfig
                profileId={profile.id}
                config={managerConfig}
                onChange={setManagerConfig}
              />
              <ManagerBankVault />
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-6 border-t border-gray-800 lg:col-span-2">
            <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Powered by SoundChain AI Agent
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// Bypass legacy Layout wrapper — standalone page with its own nav
ManagerPage.getLayout = ((page: ReactElement) => page) as CustomLayout
