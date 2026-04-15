/**
 * Archive — Saved/Bookmarked posts (IG-style)
 * Shows all bookmarked posts in a grid + list view
 */
import { useEffect, useState, useCallback, ReactElement } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
import { Bookmark, Grid, List, RefreshCw, Music, Image as ImageIcon, Film, MessageCircle, Heart, ExternalLink } from 'lucide-react'

export default function ArchivePage() {
  const me = useMe()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchBookmarks = useCallback(async (skip = 0) => {
    if (!me?.profile?.id) return
    setLoading(true)
    try {
      const r = await fetch(`/api/posts/bookmarks?limit=50&skip=${skip}`)
      if (r.ok) {
        const data = await r.json()
        if (skip === 0) setPosts(data.posts || [])
        else setPosts(prev => [...prev, ...(data.posts || [])])
        setTotalCount(data.totalCount || 0)
      }
    } catch {}
    setLoading(false)
  }, [me?.profile?.id])

  useEffect(() => { fetchBookmarks() }, [fetchBookmarks])

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <TopNavBar />
      {/* Header */}
      <div className="border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Bookmark className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-mono font-bold text-cyan-400 tracking-wider">ARCHIVE</h1>
                <p className="text-[10px] font-mono text-gray-600">{totalCount} saved posts · bookmarks · saved content</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'text-cyan-400 bg-white/5' : 'text-gray-600'}`}>
                <Grid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'text-cyan-400 bg-white/5' : 'text-gray-600'}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => fetchBookmarks()} className="text-[10px] font-mono text-gray-500 hover:text-cyan-400 px-3 py-1.5 rounded border border-white/10 transition">
                <RefreshCw className={`w-3 h-3 inline ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button onClick={() => router.push('/dex/feed')} className="text-[10px] font-mono text-gray-500 hover:text-white px-3 py-1.5 rounded border border-white/10 transition">
                BACK
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading && posts.length === 0 && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/[0.02] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 text-gray-800 mx-auto mb-3" />
            <p className="text-sm font-mono text-gray-600">No saved posts yet</p>
            <p className="text-[10px] font-mono text-gray-700 mt-1">Bookmark posts from your feed to see them here</p>
          </div>
        )}

        {viewMode === 'grid' ? (
          /* IG-style grid */
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post: any) => (
              <div
                key={post.id}
                onClick={() => window.open(`/dex/post/${post.id}`, '_blank', 'noopener')}
                className="aspect-square relative rounded overflow-hidden cursor-pointer group bg-gray-900"
              >
                {/* Media thumbnail */}
                {post.uploadedMediaUrl || post.mediaThumbnail ? (
                  <img src={post.mediaThumbnail || post.uploadedMediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : post.mediaLink ? (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center">
                    <Film className="w-8 h-8 text-gray-700" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-3">
                    <p className="text-[9px] font-mono text-gray-600 line-clamp-4 text-center">
                      {(post.body || '').replace(/https?:\/\/\S+/g, '').replace(/\{[^}]+\}/g, '').trim() || 'Saved post'}
                    </p>
                  </div>
                )}

                {/* Hover overlay with stats */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-white" />
                    <span className="text-xs font-mono text-white">{post.totalReactions || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span className="text-xs font-mono text-white">{post.commentCount || 0}</span>
                  </div>
                </div>

                {/* Type badge */}
                <div className="absolute top-1 right-1">
                  {post.uploadedMediaType === 'video' && <Film className="w-3 h-3 text-white drop-shadow" />}
                  {post.trackId && <Music className="w-3 h-3 text-cyan-400 drop-shadow" />}
                  {post.uploadedMediaType === 'image' && <ImageIcon className="w-3 h-3 text-white drop-shadow" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-2">
            {posts.map((post: any) => (
              <div
                key={post.id}
                onClick={() => window.open(`/dex/post/${post.id}`, '_blank', 'noopener')}
                className="flex gap-3 p-3 rounded-lg border border-white/5 bg-black/40 hover:bg-black/60 cursor-pointer transition group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-900">
                  {post.uploadedMediaUrl || post.mediaThumbnail ? (
                    <img src={post.mediaThumbnail || post.uploadedMediaUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-gray-700" />
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.profile?.profilePicture && (
                      <img src={post.profile.profilePicture} alt="" className="w-4 h-4 rounded-full" />
                    )}
                    <span className="text-[10px] font-mono text-white font-bold">{post.profile?.displayName || post.profile?.userHandle || 'Unknown'}</span>
                    <span className="text-[8px] font-mono text-gray-700">
                      {post.bookmarkedAt ? new Date(post.bookmarkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  {post.body && <p className="text-[10px] font-mono text-gray-400 line-clamp-2">{post.body}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[8px] font-mono text-gray-600">
                    <span>{post.totalReactions || 0} reactions</span>
                    <span>{post.commentCount || 0} comments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {posts.length < totalCount && (
          <button
            onClick={() => fetchBookmarks(posts.length)}
            disabled={loading}
            className="w-full mt-4 py-2 text-[10px] font-mono text-cyan-400/60 hover:text-cyan-400 border border-white/5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'LOADING...' : `LOAD MORE (${posts.length}/${totalCount})`}
          </button>
        )}
      </div>
    </div>
  )
}

// Skip default Layout — use our own TopNavBar
;(ArchivePage as any).getLayout = (page: ReactElement) => page
