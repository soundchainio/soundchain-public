'use client'

import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import Head from 'next/head'
import { config } from 'config'
import { createApolloClient } from 'lib/apollo'
import { PostDocument, PostQuery } from 'lib/graphql'
import { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'

/**
 * Embeddable Post Player
 *
 * This page is designed to be embedded in iframes by social platforms.
 * It provides a lightweight, auto-playing media experience.
 *
 * Used by:
 * - Twitter Player Cards
 * - Facebook Video Embeds
 * - oEmbed consumers
 * - Direct iframe embeds
 */

interface EmbedPostPageProps {
  post: PostQuery['post'] | null
  postId: string
}

interface EmbedPostPageParams extends ParsedUrlQuery {
  id: string
}

// Extract YouTube video ID
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

// Extract Vimeo video ID
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match ? match[1] : null
}

// Get thumbnail URL
function getThumbnail(post: PostQuery['post'] | null): string {
  if (post?.track?.artworkUrl) return post.track.artworkUrl

  if (post?.mediaLink) {
    const ytId = getYouTubeId(post.mediaLink)
    if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
  }

  if (post?.profile?.profilePicture) return post.profile.profilePicture

  return `${config.domainUrl}/soundchain-meta-logo.png`
}

export const getServerSideProps: GetServerSideProps<EmbedPostPageProps, EmbedPostPageParams> = async context => {
  const postId = context.params?.id

  if (!postId) {
    return { notFound: true }
  }

  try {
    const apolloClient = createApolloClient(context)
    const { data } = await apolloClient.query({
      query: PostDocument,
      variables: { id: postId },
    })

    return {
      props: {
        post: data?.post || null,
        postId,
      },
    }
  } catch (e) {
    console.error('Error fetching post for embed:', e)
    return {
      props: {
        post: null,
        postId,
      },
    }
  }
}

export default function EmbedPostPage({ post, postId }: EmbedPostPageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)

  const thumbnail = getThumbnail(post)
  const title = post?.track?.title || post?.profile?.displayName || 'SoundChain'
  const artist = post?.track?.artist || post?.profile?.userHandle || ''

  // Determine media type and URL
  const getMediaInfo = () => {
    if (post?.track?.playbackUrl) {
      return { type: 'audio', url: post.track.playbackUrl }
    }
    if (post?.mediaLink) {
      if (getYouTubeId(post.mediaLink)) {
        return { type: 'youtube', url: post.mediaLink }
      }
      if (getVimeoId(post.mediaLink)) {
        return { type: 'vimeo', url: post.mediaLink }
      }
      // Check for other embeddable content
      if (post.mediaLink.includes('spotify.com')) {
        return { type: 'spotify', url: post.mediaLink }
      }
      if (post.mediaLink.includes('soundcloud.com')) {
        return { type: 'soundcloud', url: post.mediaLink }
      }
    }
    return { type: 'none', url: null }
  }

  const mediaInfo = getMediaInfo()

  const handlePlay = () => {
    setShowOverlay(false)
    setIsPlaying(true)
  }

  // Handle click on the entire player to open SoundChain
  const handleOpenSoundChain = () => {
    window.open(`${config.domainUrl}/posts/${postId}`, '_blank')
  }

  return (
    <>
      <Head>
        <title>{title} | SoundChain</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}</style>
      </Head>

      <div className="w-full h-screen bg-black relative overflow-hidden">
        {/* YouTube/Vimeo Player */}
        {(mediaInfo.type === 'youtube' || mediaInfo.type === 'vimeo') && mediaInfo.url && (
          <>
            {showOverlay && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer"
                style={{ backgroundImage: `url(${thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                onClick={handlePlay}
              >
                <div className="absolute inset-0 bg-black/40" />
                <button className="relative z-20 w-20 h-20 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-2xl">
                  <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <div className="relative z-20 mt-4 text-center px-4">
                  <p className="text-white font-bold text-lg drop-shadow-lg">{title}</p>
                  {artist && <p className="text-white/80 text-sm drop-shadow-lg">{artist}</p>}
                </div>
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <img src={`${config.domainUrl}/soundchain-logo.png`} alt="SoundChain" className="w-6 h-6" />
                  <span className="text-white/80 text-xs">SoundChain</span>
                </div>
              </div>
            )}
            <ReactPlayer
              url={mediaInfo.url}
              width="100%"
              height="100%"
              playing={isPlaying}
              controls
              playsinline
              config={{
                youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                vimeo: { playerOptions: { responsive: true, playsinline: true } },
              }}
            />
          </>
        )}

        {/* Audio Player (SoundChain tracks) */}
        {mediaInfo.type === 'audio' && mediaInfo.url && (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
          >
            {/* Album Art */}
            <div className="relative mb-6">
              <img
                src={thumbnail}
                alt={title}
                className="w-48 h-48 rounded-xl shadow-2xl object-cover"
              />
              {!isPlaying && (
                <button
                  onClick={handlePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}
            </div>

            {/* Track Info */}
            <h1 className="text-white font-bold text-xl text-center mb-1">{title}</h1>
            <p className="text-gray-400 text-sm mb-4">{artist}</p>

            {/* Audio Element */}
            <audio
              src={mediaInfo.url}
              controls
              autoPlay={isPlaying}
              className="w-full max-w-sm"
              style={{ filter: 'invert(1)' }}
            />

            {/* SoundChain Branding */}
            <button
              onClick={handleOpenSoundChain}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <img src={`${config.domainUrl}/soundchain-logo.png`} alt="SoundChain" className="w-5 h-5" />
              <span className="text-white text-sm">Open in SoundChain</span>
            </button>
          </div>
        )}

        {/* Spotify/SoundCloud Embeds */}
        {(mediaInfo.type === 'spotify' || mediaInfo.type === 'soundcloud') && mediaInfo.url && (
          <iframe
            src={mediaInfo.url}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* No Media - Show Post Preview */}
        {mediaInfo.type === 'none' && (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
            onClick={handleOpenSoundChain}
          >
            {post?.profile?.profilePicture && (
              <img
                src={post.profile.profilePicture}
                alt={post.profile.displayName || 'User'}
                className="w-20 h-20 rounded-full mb-4 border-2 border-white/20"
              />
            )}
            <h1 className="text-white font-bold text-lg text-center mb-2">
              {post?.profile?.displayName || 'SoundChain Post'}
            </h1>
            {post?.body && (
              <p className="text-gray-300 text-sm text-center line-clamp-3 max-w-sm mb-4">
                {post.body}
              </p>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 rounded-full hover:bg-cyan-400 transition-colors">
              <span className="text-black font-semibold text-sm">View on SoundChain</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
