import { ReactElement, useState, useMemo } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ChevronLeft, Calendar, Users, Briefcase, Music, ExternalLink } from 'lucide-react'
import { config } from 'config'
import { CustomLayout } from 'pages/_app'
import { createApolloClient } from 'lib/apollo'
import {
  ProfileByHandleDocument,
  ProfileByHandleQuery,
  useProfileByHandleQuery,
  useGroupedTracksQuery,
  SortTrackField,
  SortOrder,
} from 'lib/graphql'
import { useMe } from 'hooks/useMe'
import { Logo } from 'icons/Logo'
import { ManagerGreeting } from 'components/manager/ManagerGreeting'
import { ManagerContactForm } from 'components/manager/ManagerContactForm'
import { ManagerConfig, loadManagerConfig, ManagerConfigData } from 'components/manager/ManagerConfig'

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
}

export const getServerSideProps: GetServerSideProps<ManagerPageProps> = async (context) => {
  const handle = context.params?.handle as string
  if (!handle) return { notFound: true }

  try {
    const apolloClient = createApolloClient(context)
    const { data } = await apolloClient.query<ProfileByHandleQuery>({
      query: ProfileByHandleDocument,
      variables: { handle },
    })

    const profile = data?.profileByHandle
    if (!profile) return { notFound: true }

    const name = profile.displayName || profile.userHandle || handle
    const ogData: OgData = {
      title: `${name} | Artist Manager`,
      description: profile.bio
        ? profile.bio.substring(0, 160)
        : `Connect with ${name} on SoundChain. Book shows, propose collaborations, and make business inquiries.`,
      image: profile.profilePicture || `${config.domainUrl || 'https://soundchain.io'}/soundchain-meta-logo.png`,
      url: `/manager/${handle}`,
    }

    return { props: { ogData, handle } }
  } catch {
    return { props: { ogData: null, handle } }
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

export default function ManagerPage({ ogData, handle }: ManagerPageProps) {
  const router = useRouter()
  const pageHandle = (router.query.handle as string) || handle

  const { data: profileData, loading: profileLoading } = useProfileByHandleQuery({
    variables: { handle: pageHandle },
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
  const [managerConfig, setManagerConfig] = useState<ManagerConfigData>(() => {
    if (typeof window === 'undefined' || !profile?.id) return loadManagerConfig('')
    return loadManagerConfig(profile.id)
  })

  // Re-load config when profile ID becomes available
  useMemo(() => {
    if (profile?.id && typeof window !== 'undefined') {
      setManagerConfig(loadManagerConfig(profile.id))
    }
  }, [profile?.id])

  const displayName = profile?.displayName || profile?.userHandle || pageHandle
  const latestTrack = tracks[0]
  const vis = managerConfig.sectionsVisible

  const socialEntries = useMemo(() => {
    const sm = profile?.socialMedias
    if (!sm) return []
    return Object.entries(sm).filter(([k, v]) => k !== '__typename' && v)
  }, [profile?.socialMedias])

  const domainUrl = config.domainUrl || 'https://soundchain.io'

  // ─── Loading / Error States ──────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Artist Not Found</h1>
          <p className="text-gray-500 text-sm mb-4">The profile &quot;{pageHandle}&quot; doesn&apos;t exist.</p>
          <Link href="/" className="text-cyan-400 text-sm hover:text-cyan-300">
            Go to SoundChain
          </Link>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>{ogData?.title || `${displayName} | Artist Manager`}</title>
        <meta name="description" content={ogData?.description || `Connect with ${displayName} on SoundChain`} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={ogData?.title || `${displayName} | Artist Manager`} />
        <meta property="og:description" content={ogData?.description || `Connect with ${displayName} on SoundChain`} />
        <meta property="og:image" content={ogData?.image || `${domainUrl}/soundchain-meta-logo.png`} />
        <meta property="og:url" content={`${domainUrl}/manager/${pageHandle}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogData?.title || `${displayName} | Artist Manager`} />
        <meta name="twitter:description" content={ogData?.description || `Connect with ${displayName} on SoundChain`} />
        <meta name="twitter:image" content={ogData?.image || `${domainUrl}/soundchain-meta-logo.png`} />
      </Head>

      <div className="min-h-screen bg-black text-white">
        {/* ─── Sticky Nav ───────────────────────────────────────────── */}
        <nav className="backdrop-blur-xl bg-black/90 border-b border-cyan-500/20 px-4 py-2.5 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <Link href="/" className="flex items-center gap-2">
                <Logo className="h-7 w-7" />
                <span className="text-sm font-bold bg-gradient-to-r from-orange-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
                  SoundChain
                </span>
              </Link>
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-500/70">Artist Manager</span>
          </div>
        </nav>

        {/* ─── Hero Section ─────────────────────────────────────────── */}
        <div className="relative h-[50vh] min-h-[280px] w-full overflow-hidden">
          {profile.coverPicture ? (
            <img
              src={profile.coverPicture}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/80 via-cyan-900/50 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Profile Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <div className="max-w-3xl mx-auto">
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

        {/* ─── Content ──────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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

          {/* Latest Tracks */}
          {vis.tracks && tracks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Latest Tracks</h2>
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

          {/* Action Buttons */}
          {activeForm ? (
            <ManagerContactForm
              type={activeForm}
              profileId={profile.id}
              artistName={displayName}
              onClose={() => setActiveForm(null)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vis.booking && (
                <button
                  onClick={() => setActiveForm('booking')}
                  className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group"
                >
                  <Calendar className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Book This Artist</p>
                    <p className="text-[10px] text-gray-500">Shows, events, residencies</p>
                  </div>
                </button>
              )}
              {vis.collab && (
                <button
                  onClick={() => setActiveForm('collab')}
                  className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
                >
                  <Users className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Propose Collab</p>
                    <p className="text-[10px] text-gray-500">Features, remixes, co-writes</p>
                  </div>
                </button>
              )}
              {vis.business && (
                <button
                  onClick={() => setActiveForm('business')}
                  className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                >
                  <Briefcase className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Business Inquiry</p>
                    <p className="text-[10px] text-gray-500">Licensing, press, management</p>
                  </div>
                </button>
              )}
              <Link
                href={`/dex/users/${pageHandle}`}
                className="flex items-center gap-2.5 p-4 rounded-xl bg-black/60 border border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all group"
              >
                <Music className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Full Profile</p>
                  <p className="text-[10px] text-gray-500">Listen, follow, explore</p>
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
            href={`/dex/users/${pageHandle}`}
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-center text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Follow on SoundChain
          </Link>

          {/* Owner Config Panel */}
          {isOwner && profile.id && (
            <ManagerConfig
              profileId={profile.id}
              config={managerConfig}
              onChange={setManagerConfig}
            />
          )}

          {/* Footer */}
          <div className="text-center py-6 border-t border-gray-800">
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
