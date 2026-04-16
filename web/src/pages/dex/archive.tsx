/**
 * Archive — Saved/Bookmarked posts (IG-style)
 * Shows all bookmarked posts in a grid + list view
 */
import { useEffect, useState, useCallback, ReactElement } from 'react'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { TopNavBar } from 'components/TopNavBar'
import { Bookmark, Grid, List, RefreshCw, Music, Image as ImageIcon, Film, MessageCircle, Heart, ExternalLink, Upload, HardDrive, Copy, Check } from 'lucide-react'

export default function ArchivePage() {
  const me = useMe()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'saved' | 'uploads'>('saved')
  const [uploads, setUploads] = useState<any[]>([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [uploadsTotal, setUploadsTotal] = useState(0)
  const [copiedCid, setCopiedCid] = useState<string | null>(null)
  const [folder, setFolder] = useState<string>('')
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({})

  const fetchBookmarks = useCallback(async (skip = 0, folderFilter = folder) => {
    if (!me?.profile?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', skip: String(skip) })
      if (folderFilter) params.set('folder', folderFilter)
      const r = await fetch(`/api/posts/bookmarks?${params}`)
      if (r.ok) {
        const data = await r.json()
        if (skip === 0) setPosts(data.posts || [])
        else setPosts(prev => [...prev, ...(data.posts || [])])
        setTotalCount(data.totalCount || 0)
        setFolderCounts(data.folderCounts || {})
      }
    } catch {}
    setLoading(false)
  }, [me?.profile?.id, folder])

  // Re-fetch when folder changes
  useEffect(() => { fetchBookmarks(0, folder) }, [folder]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUploads = useCallback(async (skip = 0) => {
    setUploadsLoading(true)
    try {
      const r = await fetch(`/api/operator/uploads?limit=50&skip=${skip}`)
      if (r.ok) {
        const data = await r.json()
        if (skip === 0) setUploads(data.uploads || [])
        else setUploads(prev => [...prev, ...(data.uploads || [])])
        setUploadsTotal(data.total || 0)
      }
    } catch {}
    setUploadsLoading(false)
  }, [])

  useEffect(() => { fetchBookmarks(); fetchUploads() }, [fetchBookmarks, fetchUploads])

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
        {/* Tab toggle: Saved | Uploads */}
        <div className="flex items-center gap-1 mb-4">
          <button onClick={() => setActiveTab('saved')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${activeTab === 'saved' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-600 border border-white/5 hover:text-white'}`}>
            <Bookmark className="w-3.5 h-3.5" /> Saved ({totalCount})
          </button>
          <button onClick={() => setActiveTab('uploads')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${activeTab === 'uploads' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-600 border border-white/5 hover:text-white'}`}>
            <Upload className="w-3.5 h-3.5" /> Uploads ({uploadsTotal})
          </button>
        </div>

        {/* ─── UPLOADS TAB ─── */}
        {activeTab === 'uploads' && (
          <div>
            {uploadsLoading && uploads.length === 0 && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/[0.02] rounded-lg animate-pulse" />)}
              </div>
            )}
            {!uploadsLoading && uploads.length === 0 && (
              <div className="text-center py-16">
                <Upload className="w-12 h-12 text-gray-800 mx-auto mb-3" />
                <p className="text-sm font-mono text-gray-600">No uploads yet</p>
                <p className="text-[10px] font-mono text-gray-700 mt-1">Use Operator to upload files to IPFS</p>
              </div>
            )}
            {uploads.length > 0 && (
              <div className="border border-white/5 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-0 px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
                  <span className="col-span-1 text-[7px] font-mono text-gray-600">#</span>
                  <span className="col-span-3 text-[7px] font-mono text-gray-600">FILE</span>
                  <span className="col-span-2 text-[7px] font-mono text-gray-600">SIZE</span>
                  <span className="col-span-2 text-[7px] font-mono text-gray-600">FOLDER</span>
                  <span className="col-span-3 text-[7px] font-mono text-gray-600">CID</span>
                  <span className="col-span-1 text-[7px] font-mono text-gray-600 text-right">DATE</span>
                </div>
                {uploads.map((u: any, i: number) => {
                  const shortCid = u.cid ? `${u.cid.slice(0, 8)}...${u.cid.slice(-4)}` : '—'
                  const isCopied = copiedCid === u.cid
                  return (
                    <div key={u.id || i} className="grid grid-cols-12 gap-0 px-3 py-2 items-center border-b border-white/[0.02] hover:bg-white/[0.03] transition">
                      <span className="col-span-1 text-[8px] font-mono text-gray-600">{i + 1}</span>
                      <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                        <HardDrive className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="text-[9px] font-mono text-white truncate">{u.fileName}</span>
                      </div>
                      <span className="col-span-2 text-[8px] font-mono text-gray-500">
                        {u.fileSize < 1024 ? `${u.fileSize} B` : u.fileSize < 1048576 ? `${(u.fileSize / 1024).toFixed(1)} KB` : `${(u.fileSize / 1048576).toFixed(1)} MB`}
                      </span>
                      <span className="col-span-2 text-[8px] font-mono text-green-400/60">{u.folder || '/uploads/'}</span>
                      <div className="col-span-3 flex items-center gap-1">
                        <a href={u.gateway || `https://gateway.pinata.cloud/ipfs/${u.cid}`} target="_blank" rel="noopener noreferrer" className="text-[7px] font-mono text-cyan-500/60 hover:text-cyan-400 truncate">
                          {shortCid}
                        </a>
                        <button onClick={() => { navigator.clipboard.writeText(u.gateway || `https://gateway.pinata.cloud/ipfs/${u.cid}`); setCopiedCid(u.cid); setTimeout(() => setCopiedCid(null), 2000) }} className="flex-shrink-0">
                          {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-700 hover:text-cyan-400 transition" />}
                        </button>
                      </div>
                      <span className="col-span-1 text-[7px] font-mono text-gray-700 text-right">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {uploads.length < uploadsTotal && (
              <button onClick={() => fetchUploads(uploads.length)} disabled={uploadsLoading} className="w-full mt-4 py-2 text-[10px] font-mono text-green-400/60 hover:text-green-400 border border-white/5 rounded-lg transition disabled:opacity-50">
                {uploadsLoading ? 'LOADING...' : `LOAD MORE (${uploads.length}/${uploadsTotal})`}
              </button>
            )}
          </div>
        )}

        {/* ─── SAVED TAB ─── */}
        {activeTab === 'saved' && <>
        {/* Folder sub-tabs: All / Posts / Reels / Stories / Music / Media */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-hide">
          {[
            { id: '', label: 'All', count: Object.values(folderCounts).reduce((a: number, b: any) => a + b, 0) },
            { id: 'posts', label: '/posts/', count: folderCounts.posts || 0 },
            { id: 'reels', label: '/reels/', count: folderCounts.reels || 0 },
            { id: 'stories', label: '/stories/', count: folderCounts.stories || 0 },
            { id: 'music', label: '/music/', count: folderCounts.music || 0 },
            { id: 'media', label: '/media/', count: folderCounts.media || 0 },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                setFolder(f.id)
                fetch('/api/agent/analytics-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'archive_folder_switch', meta: { folder: f.id || 'all' } }) }).catch(() => {})
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap transition ${folder === f.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-600 border border-white/5 hover:text-white'}`}
            >
              {f.label} <span className="text-[8px] opacity-60">({f.count})</span>
            </button>
          ))}
        </div>

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
                      {(post.body || '').replace(/\|emote(?:gif)?:[^|]*\|https?:\/\/[^\s|]*/g, '').replace(/\[emote:[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\{[^}]+\}/g, '').trim() || 'Saved post'}
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
        </>}
      </div>
    </div>
  )
}

// Skip default Layout — use our own TopNavBar
;(ArchivePage as any).getLayout = (page: ReactElement) => page
