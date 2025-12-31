/**
 * User Profile Page - /dex/users/[handle]
 *
 * Server-side rendered profile page with DEX styling.
 * Fetches profile by userHandle for SEO and instant loading.
 */

import { ProfileHeader } from 'components/dex/ProfileHeader'
import { Posts } from 'components/Post/Posts'
import { TracksGrid } from 'components/dex/TracksGrid'
import SEO from 'components/SEO'
import { Button } from 'components/ui/button'
import { Card, CardContent } from 'components/ui/card'
import { Badge } from 'components/ui/badge'
import { useMe } from 'hooks/useMe'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { ProfileByHandleDocument, ProfileByHandleQuery, useFollowProfileMutation, useUnfollowProfileMutation } from 'lib/graphql'
import { config } from 'config'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useState } from 'react'
import { ChevronLeft, Music, ListMusic, ExternalLink } from 'lucide-react'
import { NewPost } from 'icons/NewPost'

export interface UserProfilePageProps {
  profile: ProfileByHandleQuery['profileByHandle']
}

interface UserProfilePageParams extends ParsedUrlQuery {
  handle: string
}

export const getServerSideProps: GetServerSideProps<UserProfilePageProps, UserProfilePageParams> = async context => {
  const handle = context.params?.handle

  if (!handle) {
    return { notFound: true }
  }

  const apolloClient = createApolloClient(context)

  try {
    const { data, error } = await apolloClient.query({
      query: ProfileByHandleDocument,
      variables: { handle },
      context,
    })

    if (!data?.profileByHandle || error) {
      return { notFound: true }
    }

    return cacheFor(UserProfilePage, { profile: data.profileByHandle }, context, apolloClient)
  } catch (err) {
    console.error('Error fetching profile:', err)
    return { notFound: true }
  }
}

export default function UserProfilePage({ profile }: UserProfilePageProps) {
  const router = useRouter()
  const me = useMe()
  const [profileTab, setProfileTab] = useState<'feed' | 'music' | 'playlists'>('feed')

  const [followProfile] = useFollowProfileMutation()
  const [unfollowProfile] = useUnfollowProfileMutation()

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Card className="retro-card p-6 text-center">
          <p className="text-yellow-400 mb-2">Profile not found</p>
          <p className="text-gray-500 text-sm">This user doesn't exist or may have been deleted.</p>
          <Button variant="ghost" onClick={() => router.back()} className="mt-4 hover:bg-cyan-500/10">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  const viewingProfile = profile
  const isOwnProfile = me?.profile?.id === viewingProfile.id

  return (
    <>
      {/* Dynamic SEO for profile sharing - 8K quality avatar card */}
      <Head>
        <title>{viewingProfile.displayName || viewingProfile.userHandle} | SoundChain</title>
        <meta name="description" content={viewingProfile.bio || `Check out ${viewingProfile.displayName || viewingProfile.userHandle} on SoundChain - Web3 Music Platform`} />

        {/* OpenGraph for Facebook/LinkedIn */}
        <meta property="og:title" content={`${viewingProfile.displayName || viewingProfile.userHandle} | SoundChain`} />
        <meta property="og:description" content={viewingProfile.bio || `Join SoundChain to connect with ${viewingProfile.displayName || viewingProfile.userHandle}`} />
        <meta property="og:image" content={viewingProfile.profilePicture || `${config.domainUrl}/soundchain-meta-logo.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`${config.domainUrl}/dex/users/${viewingProfile.userHandle}`} />
        <meta property="og:site_name" content="SoundChain" />

        {/* Twitter Card - Large Image */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${viewingProfile.displayName || viewingProfile.userHandle} | SoundChain`} />
        <meta name="twitter:description" content={viewingProfile.bio || `Web3 Music Artist on SoundChain`} />
        <meta name="twitter:image" content={viewingProfile.profilePicture || `${config.domainUrl}/soundchain-meta-logo.png`} />
        <meta name="twitter:site" content="@SoundChainFM" />

        {/* Canonical URL */}
        <link rel="canonical" href={`${config.domainUrl}/dex/users/${viewingProfile.userHandle}`} />
      </Head>

      <div className="min-h-screen bg-[#0a0a0a]">
        {/* DEX-style content area */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-32">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.back()} className="hover:bg-cyan-500/10 text-cyan-400">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Full Profile Header Component - DEX Style */}
          <ProfileHeader
            user={{
              name: viewingProfile.displayName || 'Unknown',
              username: `@${viewingProfile.userHandle}`,
              bio: viewingProfile.bio || '',
              walletAddress: viewingProfile.magicWalletAddress || '0x...',
              tracks: 0,
              followers: viewingProfile.followerCount || 0,
              likes: viewingProfile.followingCount || 0,
              avatar: viewingProfile.profilePicture || undefined,
              isVerified: viewingProfile.verified || viewingProfile.teamMember || false,
              coverPicture: viewingProfile.coverPicture || undefined,
            }}
            isOwnProfile={isOwnProfile}
          />

          {/* Social Links - DEX Style */}
          {viewingProfile.socialMedias && (
            <Card className="retro-card">
              <CardContent className="p-6">
                <h2 className="retro-title text-lg mb-4">Social Links</h2>
                <div className="flex flex-wrap gap-3">
                  {viewingProfile.socialMedias.twitter && (
                    <a href={`https://twitter.com/${viewingProfile.socialMedias.twitter}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="border-blue-500/50 hover:bg-blue-500/10 text-blue-400">
                        Twitter
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                  {viewingProfile.socialMedias.instagram && (
                    <a href={`https://instagram.com/${viewingProfile.socialMedias.instagram}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="border-pink-500/50 hover:bg-pink-500/10 text-pink-400">
                        Instagram
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                  {viewingProfile.socialMedias.spotify && (
                    <a href={viewingProfile.socialMedias.spotify} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="border-green-500/50 hover:bg-green-500/10 text-green-400">
                        Spotify
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                  {viewingProfile.socialMedias.soundcloud && (
                    <a href={`https://soundcloud.com/${viewingProfile.socialMedias.soundcloud}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="border-orange-500/50 hover:bg-orange-500/10 text-orange-400">
                        SoundCloud
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                  {viewingProfile.socialMedias.discord && (
                    <a href={viewingProfile.socialMedias.discord} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400">
                        Discord
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                  {viewingProfile.socialMedias.linktree && (
                    <a href={`https://linktr.ee/${viewingProfile.socialMedias.linktree}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400">
                        Linktree
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Favorite Genres */}
          {(viewingProfile.favoriteGenres?.length ?? 0) > 0 && (
            <Card className="retro-card">
              <CardContent className="p-6">
                <h2 className="retro-title text-lg mb-4">Favorite Genres</h2>
                <div className="flex flex-wrap gap-2">
                  {viewingProfile.favoriteGenres?.map((genre) => (
                    <Badge key={genre} className="bg-purple-500/20 text-purple-400 border border-purple-500/30">{genre}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Tabs - Feed | Music | Playlists */}
          <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm border-b border-neutral-800 rounded-lg overflow-hidden">
            <div className="flex">
              <button
                onClick={() => setProfileTab('feed')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  profileTab === 'feed'
                    ? 'text-white border-b-2 border-cyan-400 bg-cyan-500/10'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
              >
                <NewPost className="w-4 h-4" fillColor={profileTab === 'feed' ? '#22d3ee' : '#6b7280'} />
                Feed
              </button>
              <button
                onClick={() => setProfileTab('music')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  profileTab === 'music'
                    ? 'text-white border-b-2 border-purple-400 bg-purple-500/10'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
              >
                <Music className={`w-4 h-4 ${profileTab === 'music' ? 'text-purple-400' : ''}`} />
                Music
              </button>
              <button
                onClick={() => setProfileTab('playlists')}
                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  profileTab === 'playlists'
                    ? 'text-white border-b-2 border-pink-400 bg-pink-500/10'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
              >
                <ListMusic className={`w-4 h-4 ${profileTab === 'playlists' ? 'text-pink-400' : ''}`} />
                Playlists
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {profileTab === 'feed' && (
              <Posts profileId={viewingProfile.id} />
            )}
            {profileTab === 'music' && (
              <TracksGrid profileId={viewingProfile.id} />
            )}
            {profileTab === 'playlists' && (
              <Card className="retro-card p-8 text-center">
                <ListMusic className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="text-white font-bold mb-2">Playlists Coming Soon</h3>
                <p className="text-gray-400 text-sm">User playlists will be available here</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
