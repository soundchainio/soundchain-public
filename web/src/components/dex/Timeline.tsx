import React, { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Separator } from '../ui/separator'
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Music,
  Flame,
  Rocket,
  Play,
  Youtube,
  Headphones,
  Pause
} from 'lucide-react'

const userAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
const postImage = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop"

function CreatePostCard() {
  return (
    <Card className="retro-card p-4 lg:p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 analog-glow">
            <AvatarImage src={userAvatar} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <input
              type="text"
              placeholder="What's happening in SoundChain?"
              className="w-full bg-transparent text-lg placeholder:text-gray-500 focus:outline-none text-white retro-text"
            />
          </div>
        </div>
        <Separator className="bg-cyan-500/20" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hover:bg-cyan-500/20">
              <Music className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-purple-500/20">
              <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-purple-600 rounded" />
            </Button>
          </div>
          <Button className="retro-button">Post</Button>
        </div>
      </div>
    </Card>
  )
}

interface Post {
  id: number
  author: string
  content: string
  image?: string
  youtubeUrl?: string
  avatar?: string
  verified?: boolean
  likes: number
  comments: number
  reposts: number
  time: string
  premium?: boolean
}

function PostCard({ post }: { post: Post }) {
  const [isLiked, setIsLiked] = useState(false)

  return (
    <Card className="retro-card overflow-hidden">
      <div className="p-4 lg:p-6 space-y-4">
        {/* Post header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 analog-glow">
              <AvatarImage src={post.avatar || userAvatar} />
              <AvatarFallback>{post.author?.charAt(0) || 'X'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="retro-text text-white">{post.author || 'Xamã'}</span>
                <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                {post.verified && (
                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
              <span className="retro-json text-xs">{post.time}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hover:bg-cyan-500/20">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Post content */}
        <p className="text-gray-300 text-sm lg:text-base leading-relaxed">
          {post.content}
        </p>

        {/* YouTube Embed */}
        {post.youtubeUrl && (
          <div className="rounded-lg overflow-hidden border border-red-500/30 bg-black/40 space-y-3">
            <div className="p-4 pb-0">
              <div className="flex items-center gap-3 mb-3">
                <Youtube className="w-6 h-6 text-red-500" />
                <div className="flex-1">
                  <h4 className="retro-text text-white text-sm">YouTube Video</h4>
                  <p className="text-xs text-gray-400">{post.premium ? 'Premium Content' : 'Free Content'}</p>
                </div>
              </div>
            </div>
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
              <Play className="w-12 h-12 text-red-500" />
            </div>
          </div>
        )}

        {/* Post image */}
        {post.image && (
          <div className="rounded-lg overflow-hidden border border-cyan-500/20 analog-glow">
            <img
              src={post.image}
              alt="Post content"
              className="w-full h-48 lg:h-64 object-cover"
            />
          </div>
        )}

        {/* Post reactions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Flame className="w-3 h-3 text-white" />
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-3 h-3 text-white" />
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <Rocket className="w-3 h-3 text-white" />
                </div>
              </div>
              <span className="retro-json text-xs">{post.likes} Likes</span>
            </div>
            <span className="retro-json text-xs">{post.comments} Comments</span>
            <span className="retro-json text-xs hidden sm:inline">{post.reposts} Reposts</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="border-t border-cyan-500/20 p-3 lg:p-4 bg-black/20">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
            className={`hover:bg-red-500/20 hover:text-red-400 ${isLiked ? 'text-red-400' : ''}`}
          >
            <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Like</span>
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-blue-500/20 hover:text-blue-400">
            <MessageCircle className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Comment</span>
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-purple-500/20 hover:text-purple-400">
            <Share2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface Playlist {
  title: string
  artist: string
  plays: number
  likes: number
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <Card className="retro-card p-4 group hover:border-cyan-400/50 transition-all duration-300">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-cyan-400" />
            <span className="metadata-label text-xs">Playlist</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 p-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-cyan-400" />
            ) : (
              <Play className="w-4 h-4 text-cyan-400" />
            )}
          </Button>
        </div>
        <h4 className="retro-text text-white">{playlist.title}</h4>
        <p className="text-sm text-gray-400">By {playlist.artist}</p>
        <div className="flex items-center gap-4 text-xs text-cyan-400/60">
          <div className="flex items-center gap-1">
            <Play className="w-3 h-3" />
            <span>{playlist.plays}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>{playlist.likes}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function Timeline() {
  const mockPosts: Post[] = [
    {
      id: 0,
      author: "SoundChain.io",
      content: "Check out our curated collection of Music NFTs from our amazing artists on the SoundChain platform. This is what the future of music sounds like! #SoundChain #MusicNFTs #Web3Music",
      image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop",
      premium: false,
      avatar: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100&h=100&fit=crop&crop=face",
      verified: true,
      likes: 89,
      comments: 47,
      reposts: 32,
      time: "1 hour ago"
    },
    {
      id: 1,
      author: "Xama",
      content: "Good morning SoundChain Users!! New UI/UX updates are on the horizon!! OGUN Gamification is in the works and coming soon!!",
      image: postImage,
      likes: 4,
      comments: 22,
      reposts: 1,
      time: "4 hours ago"
    },
    {
      id: 2,
      author: "MusicProducer.eth",
      content: "Just dropped an exclusive behind-the-scenes look at my latest studio session! This is premium content - unlock to see how the magic happens.",
      image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=400&fit=crop",
      premium: true,
      avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face",
      verified: true,
      likes: 18,
      comments: 34,
      reposts: 9,
      time: "6 hours ago"
    },
    {
      id: 3,
      author: "Web3Artist",
      content: "The future of music is here with Web3 technology. Excited to be part of this revolutionary platform that puts artists first!",
      image: postImage,
      likes: 23,
      comments: 15,
      reposts: 7,
      time: "3 days ago"
    }
  ]

  const mockPlaylists: Playlist[] = [
    { title: "Banging Beats", artist: "Dylan Yem", plays: 128, likes: 24 },
    { title: "Chill Vibes", artist: "Dylan Yem", plays: 256, likes: 47 },
    { title: "Web3 Anthems", artist: "Various Artists", plays: 512, likes: 89 }
  ]

  const genres = [
    "Acoustic", "Alternative", "Blues", "Americana", "Cannabis",
    "Ambient", "C-Pop", "Electronic", "Hip-Hop", "Jazz"
  ]

  return (
    <div className="flex flex-col space-y-4">
      {/* Create Post */}
      <CreatePostCard />

      {/* Scrollable Content Container */}
      <div className="space-y-6 pr-2">
        {/* Genres */}
        <div className="space-y-4">
          <h3 className="metadata-label">Favorite Genres</h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Badge
                key={genre}
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Playlists */}
        <div className="space-y-4">
          <h3 className="metadata-label">Playlists</h3>
          <div className="space-y-3">
            {mockPlaylists.map((playlist, index) => (
              <PlaylistCard key={index} playlist={playlist} />
            ))}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          <h3 className="metadata-label">Timeline</h3>
          <div className="space-y-6">
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
