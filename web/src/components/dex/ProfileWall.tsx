import React, { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'
import { Button } from 'components/ui/button'
import {
  Send, Trash2, Pin, MessageCircle, ChevronDown, Flame, Play, Trophy,
  TrendingUp, Sparkles, Users, BadgeCheck, Music, BarChart3, Eye, Disc3,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useTracksQuery, useExploreUsersQuery, SortTrackField, SortOrder } from 'lib/graphql'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'

const WALL_POSTS_QUERY = gql`
  query WallPosts($profileId: String!, $page: PageInput) {
    wallPosts(profileId: $profileId, page: $page) {
      nodes {
        id
        profileId
        authorProfileId
        body
        pinned
        createdAt
        author {
          id
          displayName
          userHandle
          profilePicture
        }
        replyCount
        replies {
          id
          authorProfileId
          body
          createdAt
          author {
            id
            displayName
            userHandle
            profilePicture
          }
        }
      }
      pageInfo {
        totalCount
        hasNextPage
      }
    }
  }
`

const CREATE_WALL_POST = gql`
  mutation CreateWallPost($profileId: String!, $body: String!, $replyToId: String) {
    createWallPost(profileId: $profileId, body: $body, replyToId: $replyToId) {
      id
      body
      createdAt
      author {
        id
        displayName
        userHandle
        profilePicture
      }
    }
  }
`

const DELETE_WALL_POST = gql`
  mutation DeleteWallPost($wallPostId: String!) {
    deleteWallPost(wallPostId: $wallPostId)
  }
`

const PIN_WALL_POST = gql`
  mutation PinWallPost($wallPostId: String!) {
    pinWallPost(wallPostId: $wallPostId) {
      id
      pinned
    }
  }
`

interface ProfileWallProps {
  profileId: string
  isOwnProfile: boolean
  viewerProfileId?: string
  profileName?: string
}

export function ProfileWall({ profileId, isOwnProfile, viewerProfileId, profileName }: ProfileWallProps) {
  const [body, setBody] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [page, setPage] = useState(1)
  const { playlistState } = useAudioPlayerContext()

  const { data, loading, refetch } = useQuery(WALL_POSTS_QUERY, {
    variables: { profileId, page: { first: 20 * page } },
    fetchPolicy: 'cache-and-network',
  })

  // Trending tracks
  const { data: trendingData } = useTracksQuery({
    variables: {
      page: { first: 8 },
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
    },
  })

  // Top NFT tracks
  const { data: top100Data } = useTracksQuery({
    variables: {
      page: { first: 100 },
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
    },
  })

  // Featured users
  const { data: usersData } = useExploreUsersQuery({
    variables: { page: { first: 8 } },
  })

  const trendingTracks = trendingData?.tracks?.nodes || []
  const featuredUsers = usersData?.exploreUsers?.nodes || []
  const top100NftTracks = (top100Data?.tracks?.nodes || [])
    .filter((track: any) => track.nftData?.tokenId || track.nftData?.contract)
    .slice(0, 12)

  const handlePlayTrack = (tracks: any[], index: number) => {
    const playlist: Song[] = tracks.map(t => ({
      trackId: t.id,
      src: t.playbackUrl,
      art: t.artworkUrl,
      title: t.title,
      artist: t.artist,
      isFavorite: t.isFavorite,
    }))
    playlistState(playlist, index)
  }

  const [createWallPost, { loading: posting }] = useMutation(CREATE_WALL_POST, {
    onCompleted: () => {
      setBody('')
      setReplyingTo(null)
      setReplyBody('')
      refetch()
    },
  })

  const [deleteWallPost] = useMutation(DELETE_WALL_POST, {
    onCompleted: () => refetch(),
  })

  const [pinWallPost] = useMutation(PIN_WALL_POST, {
    onCompleted: () => refetch(),
  })

  const handleSubmit = () => {
    if (!body.trim()) return
    createWallPost({ variables: { profileId, body: body.trim() } })
  }

  const handleReply = (wallPostId: string) => {
    if (!replyBody.trim()) return
    createWallPost({ variables: { profileId, body: replyBody.trim(), replyToId: wallPostId } })
  }

  const posts = data?.wallPosts?.nodes || []
  const pageInfo = data?.wallPosts?.pageInfo
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  return (
    <div className="space-y-4">
      {/* === WALL MESSAGE BOARD (top of dashboard) === */}
      {/* Write input */}
      {viewerProfileId && (
        <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Write on ${profileName || 'their'} wall...`}
              className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm min-h-[60px]"
              maxLength={1000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">{body.length}/1000</span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!body.trim() || posting}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1"
              >
                <Send className="w-3 h-3 mr-1" />
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wall Posts */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <MessageCircle className="w-4 h-4 text-orange-400" />
          <h3 className="text-white font-bold text-sm">Wall</h3>
          {pageInfo?.totalCount > 0 && (
            <span className="text-gray-600 text-xs">({pageInfo.totalCount})</span>
          )}
        </div>

        {loading && posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading wall...</div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No wall posts yet. Be the first to write!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedPosts.map((post: any) => (
              <div key={post.id} className={`p-3.5 rounded-2xl border ${post.pinned ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="flex items-start gap-2.5">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={post.author?.profilePicture} />
                    <AvatarFallback className="bg-gray-700 text-white text-xs">
                      {post.author?.displayName?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{post.author?.displayName}</span>
                      <span className="text-gray-500 text-xs">@{post.author?.userHandle}</span>
                      <span className="text-gray-600 text-xs">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                      {post.pinned && <Pin className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap break-words">{post.body}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                        className="text-gray-500 hover:text-cyan-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Reply {post.replyCount > 0 && `(${post.replyCount})`}
                      </button>
                      {(post.authorProfileId === viewerProfileId || isOwnProfile) && (
                        <button
                          onClick={() => deleteWallPost({ variables: { wallPostId: post.id } })}
                          className="text-gray-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                      {isOwnProfile && (
                        <button
                          onClick={() => pinWallPost({ variables: { wallPostId: post.id } })}
                          className={`text-xs flex items-center gap-1 transition-colors ${post.pinned ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
                        >
                          <Pin className="w-3 h-3" />
                          {post.pinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}
                    </div>

                    {/* Threaded replies */}
                    {post.replies?.length > 0 && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-white/10 space-y-2">
                        {post.replies.map((reply: any) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage src={reply.author?.profilePicture} />
                              <AvatarFallback className="bg-gray-700 text-white text-[10px]">
                                {reply.author?.displayName?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white text-xs">{reply.author?.displayName}</span>
                                <span className="text-gray-600 text-[10px]">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-gray-300 text-xs mt-0.5 whitespace-pre-wrap break-words">{reply.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === post.id && viewerProfileId && (
                      <div className="mt-3 ml-2 pl-3 border-l-2 border-cyan-500/30 flex items-center gap-2">
                        <input
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 bg-transparent text-white placeholder-gray-500 text-xs outline-none"
                          maxLength={1000}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleReply(post.id)
                            }
                          }}
                        />
                        <button
                          onClick={() => handleReply(post.id)}
                          disabled={!replyBody.trim() || posting}
                          className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {pageInfo?.hasNextPage && (
          <div className="text-center pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              className="text-gray-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Load more
            </Button>
          </div>
        )}
      </div>

      {/* === AGGREGATOR DASHBOARD — Pill Card Grid === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Trending Tracks Card */}
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-neutral-900/80 via-orange-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">Trending</h3>
            <Link href="/dex/explore" className="ml-auto text-[10px] text-orange-400 hover:text-orange-300">See all</Link>
          </div>
          <div className="space-y-1.5">
            {trendingTracks.slice(0, 5).map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => handlePlayTrack(trendingTracks, index)}
              >
                <span className={`w-4 text-center font-bold text-xs ${
                  index === 0 ? 'text-orange-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-600'
                }`}>{index + 1}</span>
                <div className="w-9 h-9 rounded-lg overflow-hidden relative flex-shrink-0">
                  <img src={track.artworkUrl ?? '/images/default-artwork.png'} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-3 h-3 text-white" fill="white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate group-hover:text-orange-400 transition-colors">{track.title}</p>
                  <p className="text-gray-500 text-[10px] truncate">{track.artist}</p>
                </div>
                <span className="text-gray-600 text-[10px] flex items-center gap-0.5 flex-shrink-0">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {track.playbackCountFormatted || '0'}
                </span>
              </div>
            ))}
            {trendingTracks.length === 0 && <p className="text-gray-600 text-xs text-center py-3">No trending tracks</p>}
          </div>
        </div>

        {/* Top NFTs Card */}
        <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-neutral-900/80 via-yellow-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">Top NFTs</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {top100NftTracks.slice(0, 8).map((track: any, index: number) => (
              <button
                key={track.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-800 hover:ring-2 hover:ring-yellow-400/60 transition-all"
                onClick={() => handlePlayTrack(top100NftTracks, index)}
                title={`#${index + 1} ${track.title}`}
              >
                <img src={track.artworkUrl ?? '/images/default-artwork.png'} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-1 left-1 bg-black/70 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-yellow-400">
                  #{index + 1}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-white truncate font-medium">{track.title}</p>
                </div>
              </button>
            ))}
          </div>
          {top100NftTracks.length === 0 && <p className="text-gray-600 text-xs text-center py-3">No NFT tracks</p>}
        </div>

        {/* Featured Artists Card */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-neutral-900/80 via-purple-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">Artists</h3>
            <Link href="/dex/users" className="ml-auto text-[10px] text-purple-400 hover:text-purple-300">Discover</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {featuredUsers.slice(0, 8).map((user) => (
              <Link
                key={user.id}
                href={`/dex/users/${user.userHandle}`}
                className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/20 group-hover:ring-purple-500/50 transition-all">
                  <img
                    src={user.profilePicture || '/images/default-avatar.png'}
                    alt={user.displayName || user.userHandle || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] text-gray-400 truncate max-w-[60px] group-hover:text-white transition-colors">
                    {user.displayName || user.userHandle}
                  </span>
                  {user.verified && <BadgeCheck className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />}
                </div>
              </Link>
            ))}
          </div>
          {featuredUsers.length === 0 && <p className="text-gray-600 text-xs text-center py-3">No artists yet</p>}
        </div>

        {/* Platform Stats Card */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-neutral-900/80 via-cyan-950/10 to-neutral-900/80 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-white font-bold text-sm">Platform</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <Disc3 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{trendingTracks.length > 0 ? '600+' : '—'}</p>
              <p className="text-gray-500 text-[10px]">NFT Tracks</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <Users className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{featuredUsers.length > 0 ? `${featuredUsers.length}+` : '—'}</p>
              <p className="text-gray-500 text-[10px]">Artists</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <Eye className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{pageInfo?.totalCount || 0}</p>
              <p className="text-gray-500 text-[10px]">Wall Posts</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-center">
              <Music className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">0.05%</p>
              <p className="text-gray-500 text-[10px]">Platform Fee</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default ProfileWall
