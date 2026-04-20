import React, { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { PlacedBuildable } from 'lib/nodeverse/buildables'

type AssetType = 'nft' | 'scid' | 'post'

interface Asset {
  id: string
  title: string
  imageUrl: string | null
  audioUrl?: string | null
  artist?: string
}

interface Props {
  candidate: PlacedBuildable
  buildableCategory: string
  buildableKind: string
  onClose: () => void
  onBound: () => void
  onDelete: () => void
}

export default function FrameBindModal({ candidate, buildableKind, onClose, onBound, onDelete }: Props) {
  const initialTab: AssetType =
    buildableKind === 'nft_frame' ? 'nft' :
    buildableKind === 'scid_frame' ? 'scid' :
    buildableKind === 'post_frame' ? 'post' :
    'scid'

  const [tab, setTab] = useState<AssetType>(initialTab)
  const [assets, setAssets] = useState<{ tracks: Asset[]; nfts: Asset[]; posts: Asset[] }>({ tracks: [], nfts: [], posts: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/nodeverse/my-frame-assets', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setAssets({
          tracks: data.tracks || [],
          nfts: data.nfts || [],
          posts: data.posts || [],
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const currentList: Asset[] =
    tab === 'nft' ? assets.nfts :
    tab === 'scid' ? assets.tracks :
    assets.posts

  const bind = async (asset: Asset) => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/nodeverse/buildables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: candidate.id,
          buildableId: candidate.buildableId,
          parcelX: candidate.parcelX,
          parcelZ: candidate.parcelZ,
          localX: candidate.localX,
          localY: candidate.localY || 0,
          localZ: candidate.localZ,
          rotY: candidate.rotY || 0,
          color: candidate.color,
          scale: candidate.scale ?? 1,
          boundAssetType: tab,
          boundAssetId: asset.id,
          boundAssetImageUrl: asset.imageUrl,
          boundAssetTitle: asset.title,
          boundAssetAudioUrl: asset.audioUrl || null,
        }),
      })
      if (res.ok) {
        onBound()
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Bind failed')
      }
    } catch (e: any) {
      alert(e?.message || 'Bind failed')
    } finally {
      setSaving(false)
    }
  }

  const unbind = async () => {
    if (saving) return
    setSaving(true)
    try {
      await fetch('/api/nodeverse/buildables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: candidate.id,
          buildableId: candidate.buildableId,
          parcelX: candidate.parcelX,
          parcelZ: candidate.parcelZ,
          localX: candidate.localX,
          localY: candidate.localY || 0,
          localZ: candidate.localZ,
          rotY: candidate.rotY || 0,
          color: candidate.color,
          scale: candidate.scale ?? 1,
          boundAssetType: null,
          boundAssetId: null,
          boundAssetImageUrl: null,
          boundAssetTitle: null,
          boundAssetAudioUrl: null,
        }),
      })
      onBound()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0a0f1f] border border-purple-500/40 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-black/40">
          <span className="text-xs font-mono font-bold text-purple-300 tracking-wider">🖼 BIND TO FRAME</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-1 px-3 py-2 border-b border-white/5 bg-black/20">
          {(['nft', 'scid', 'post'] as AssetType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-1.5 rounded text-[10px] font-mono uppercase transition ${
                tab === t
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                  : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:text-white'
              }`}
            >
              {t === 'nft' ? 'NFTs' : t === 'scid' ? 'SCIDs' : 'Posts'}
              <span className="ml-1 text-gray-500">
                ({t === 'nft' ? assets.nfts.length : t === 'scid' ? assets.tracks.length : assets.posts.length})
              </span>
            </button>
          ))}
        </div>

        <div className="p-3 max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="text-center text-[10px] font-mono text-gray-500 py-8">Loading your {tab}s…</div>
          ) : currentList.length === 0 ? (
            <div className="text-center text-[10px] font-mono text-gray-500 py-8">
              No {tab === 'nft' ? 'NFTs' : tab === 'scid' ? 'uploaded tracks' : 'posts with media'} yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {currentList.map(a => {
                const isBound = candidate.boundAssetType === tab && candidate.boundAssetId === a.id
                return (
                  <button
                    key={a.id}
                    onClick={() => bind(a)}
                    disabled={saving}
                    className={`group relative flex flex-col rounded overflow-hidden border transition ${
                      isBound
                        ? 'border-green-400 ring-1 ring-green-400/50'
                        : 'border-white/10 hover:border-purple-500/50'
                    }`}
                  >
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt={a.title} className="w-full aspect-square object-cover bg-black" />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-purple-900/40 to-black flex items-center justify-center text-2xl">
                        {tab === 'nft' ? '🖼' : tab === 'scid' ? '🎵' : '📝'}
                      </div>
                    )}
                    <div className="px-1.5 py-1 text-[9px] font-mono text-white truncate bg-black/60">{a.title || 'Untitled'}</div>
                    {isBound && (
                      <div className="absolute top-1 right-1 bg-green-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded">BOUND</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-purple-500/20 bg-black/40">
          {candidate.boundAssetId && (
            <button
              onClick={unbind}
              disabled={saving}
              className="px-3 py-1.5 rounded text-[9px] font-mono text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10"
            >
              Unbind
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded text-[9px] font-mono text-red-400 border border-red-500/30 hover:bg-red-500/10 inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Remove frame
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-3 py-1.5 rounded text-[9px] font-mono text-gray-400 border border-white/10 hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
