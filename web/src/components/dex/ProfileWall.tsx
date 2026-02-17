import React, { useState } from 'react'
import { gql, useQuery, useMutation } from '@apollo/client'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'
import { Button } from 'components/ui/button'
import { Send, Trash2, Pin, MessageCircle, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

  const { data, loading, fetchMore, refetch } = useQuery(WALL_POSTS_QUERY, {
    variables: { profileId, page: { first: 20 * page } },
    fetchPolicy: 'cache-and-network',
  })

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
  // Sort pinned posts to top
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  return (
    <div className="space-y-4">
      {/* Write input */}
      {viewerProfileId && (
        <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
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

      {/* Wall posts */}
      {loading && posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading wall...</div>
      ) : sortedPosts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No wall posts yet. Be the first to write!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPosts.map((post: any) => (
            <div key={post.id} className={`p-4 rounded-xl border ${post.pinned ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`}>
              {/* Post header */}
              <div className="flex items-start gap-3">
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
                    {post.pinned && (
                      <Pin className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    )}
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
        <div className="text-center pt-2">
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
  )
}

export default ProfileWall
