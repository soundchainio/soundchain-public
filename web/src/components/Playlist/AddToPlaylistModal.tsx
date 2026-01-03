'use client'

import { useState, useCallback, useRef } from 'react'
import {
  X, Link2, Upload, Music, Youtube, Cloud, Disc,
  ExternalLink, Loader2, AlertCircle, CheckCircle,
  GripVertical, Trash2
} from 'lucide-react'
import {
  useAddPlaylistItemMutation,
  PlaylistTrackSourceType,
  AddPlaylistItemInput
} from 'lib/graphql'
import { useUpload } from 'hooks/useUpload'

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  playlistId: string
  onSuccess?: () => void
}

// Helper to detect source type from URL
const detectSourceType = (url: string): PlaylistTrackSourceType => {
  const lowercaseUrl = url.toLowerCase()
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return PlaylistTrackSourceType.Youtube
  }
  if (lowercaseUrl.includes('soundcloud.com')) {
    return PlaylistTrackSourceType.Soundcloud
  }
  if (lowercaseUrl.includes('bandcamp.com')) {
    return PlaylistTrackSourceType.Bandcamp
  }
  if (lowercaseUrl.includes('spotify.com')) {
    return PlaylistTrackSourceType.Spotify
  }
  if (lowercaseUrl.includes('music.apple.com')) {
    return PlaylistTrackSourceType.AppleMusic
  }
  if (lowercaseUrl.includes('tidal.com')) {
    return PlaylistTrackSourceType.Tidal
  }
  if (lowercaseUrl.includes('vimeo.com')) {
    return PlaylistTrackSourceType.Vimeo
  }
  return PlaylistTrackSourceType.Custom
}

// Get icon for source type
const getSourceIcon = (sourceType: PlaylistTrackSourceType) => {
  switch (sourceType) {
    case PlaylistTrackSourceType.Youtube:
      return <Youtube className="w-4 h-4 text-red-500" />
    case PlaylistTrackSourceType.Soundcloud:
      return <Cloud className="w-4 h-4 text-orange-500" />
    case PlaylistTrackSourceType.Spotify:
      return <Disc className="w-4 h-4 text-green-500" />
    case PlaylistTrackSourceType.Bandcamp:
      return <Music className="w-4 h-4 text-cyan-500" />
    case PlaylistTrackSourceType.Upload:
      return <Upload className="w-4 h-4 text-purple-500" />
    default:
      return <ExternalLink className="w-4 h-4 text-gray-400" />
  }
}

// Get platform name from source type
const getSourceName = (sourceType: PlaylistTrackSourceType) => {
  switch (sourceType) {
    case PlaylistTrackSourceType.Youtube: return 'YouTube'
    case PlaylistTrackSourceType.Soundcloud: return 'SoundCloud'
    case PlaylistTrackSourceType.Spotify: return 'Spotify'
    case PlaylistTrackSourceType.Bandcamp: return 'Bandcamp'
    case PlaylistTrackSourceType.AppleMusic: return 'Apple Music'
    case PlaylistTrackSourceType.Tidal: return 'Tidal'
    case PlaylistTrackSourceType.Vimeo: return 'Vimeo'
    case PlaylistTrackSourceType.Upload: return 'Uploaded File'
    case PlaylistTrackSourceType.Custom: return 'External Link'
    default: return 'Unknown'
  }
}

interface PendingItem {
  id: string
  sourceType: PlaylistTrackSourceType
  url?: string
  file?: File
  title: string
  artist: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export const AddToPlaylistModal = ({ isOpen, onClose, playlistId, onSuccess }: AddToPlaylistModalProps) => {
  const [url, setUrl] = useState('')
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [addPlaylistItem] = useAddPlaylistItemMutation()
  const { upload: uploadToS3 } = useUpload()

  // Handle URL paste/add
  const handleAddUrl = () => {
    if (!url.trim()) return

    const sourceType = detectSourceType(url)
    const newItem: PendingItem = {
      id: `url-${Date.now()}`,
      sourceType,
      url: url.trim(),
      title: '',
      artist: '',
      status: 'pending'
    }

    setPendingItems(prev => [...prev, newItem])
    setUrl('')
  }

  // Handle file drop/select
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach(file => {
      // Only accept audio files
      if (!file.type.startsWith('audio/')) {
        console.warn('Skipping non-audio file:', file.name)
        return
      }

      const newItem: PendingItem = {
        id: `file-${Date.now()}-${Math.random()}`,
        sourceType: PlaylistTrackSourceType.Upload,
        file,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        artist: 'Unknown Artist',
        status: 'pending'
      }

      setPendingItems(prev => [...prev, newItem])
    })
  }, [])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  // Remove pending item
  const handleRemoveItem = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id))
  }

  // Update item metadata
  const handleUpdateItem = (id: string, field: 'title' | 'artist', value: string) => {
    setPendingItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Submit all items
  const handleSubmitAll = async () => {
    if (pendingItems.length === 0) return

    setIsSubmitting(true)

    for (const item of pendingItems) {
      if (item.status !== 'pending') continue

      setPendingItems(prev => prev.map(p =>
        p.id === item.id ? { ...p, status: 'uploading' } : p
      ))

      try {
        let input: AddPlaylistItemInput = {
          playlistId,
          sourceType: item.sourceType,
          title: item.title || 'Untitled',
          artist: item.artist || 'Unknown Artist',
        }

        if (item.sourceType === PlaylistTrackSourceType.Upload && item.file) {
          // Upload file to S3 first, then use the URL
          try {
            const uploadedUrl = await uploadToS3([item.file])
            if (!uploadedUrl) {
              throw new Error('Failed to upload file')
            }
            input.externalUrl = uploadedUrl
          } catch (uploadError: any) {
            setPendingItems(prev => prev.map(p =>
              p.id === item.id ? { ...p, status: 'error', error: uploadError.message || 'Upload failed' } : p
            ))
            continue
          }
        } else if (item.url) {
          input.externalUrl = item.url
        }

        const result = await addPlaylistItem({
          variables: { input }
        })

        if (result.data?.addPlaylistItem?.success) {
          setPendingItems(prev => prev.map(p =>
            p.id === item.id ? { ...p, status: 'success' } : p
          ))
        } else {
          throw new Error(result.data?.addPlaylistItem?.error || 'Unknown error')
        }
      } catch (error: any) {
        setPendingItems(prev => prev.map(p =>
          p.id === item.id ? { ...p, status: 'error', error: error.message } : p
        ))
      }
    }

    setIsSubmitting(false)

    // Check if all succeeded
    const allSuccess = pendingItems.every(item => item.status === 'success')
    if (allSuccess) {
      onSuccess?.()
      // Clear and close after a short delay
      setTimeout(() => {
        setPendingItems([])
        onClose()
      }, 1000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border border-pink-500/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add to Playlist</h2>
              <p className="text-sm text-gray-400">Add links from any platform or upload files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Paste a link (YouTube, SoundCloud, Spotify, Bandcamp, etc.)
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              <button
                onClick={handleAddUrl}
                disabled={!url.trim()}
                className="px-6 py-3 bg-pink-500 text-white font-medium rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-pink-500 bg-pink-500/10'
                : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-pink-400' : 'text-neutral-500'}`} />
            <p className={`font-medium ${isDragging ? 'text-pink-400' : 'text-gray-300'}`}>
              {isDragging ? 'Drop files here' : 'Drag & drop audio files'}
            </p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          </div>

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Queue ({pendingItems.length} items)
              </h3>
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      item.status === 'success'
                        ? 'border-green-500/30 bg-green-500/10'
                        : item.status === 'error'
                        ? 'border-red-500/30 bg-red-500/10'
                        : 'border-neutral-700 bg-neutral-800/50'
                    }`}
                  >
                    {/* Drag handle */}
                    <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />

                    {/* Source icon */}
                    <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      {getSourceIcon(item.sourceType)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                        placeholder="Track title"
                        disabled={item.status !== 'pending'}
                        className="w-full bg-transparent text-white font-medium placeholder-neutral-500 focus:outline-none disabled:opacity-60"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="text"
                          value={item.artist}
                          onChange={(e) => handleUpdateItem(item.id, 'artist', e.target.value)}
                          placeholder="Artist name"
                          disabled={item.status !== 'pending'}
                          className="bg-transparent text-gray-400 placeholder-neutral-600 focus:outline-none disabled:opacity-60"
                        />
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">{getSourceName(item.sourceType)}</span>
                      </div>
                      {item.error && (
                        <p className="text-red-400 text-xs mt-1">{item.error}</p>
                      )}
                    </div>

                    {/* Status / Actions */}
                    <div className="flex items-center gap-2">
                      {item.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                      )}
                      {item.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-800 bg-neutral-900/50">
          <p className="text-sm text-gray-500">
            {pendingItems.filter(i => i.status === 'pending').length} items ready to add
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-neutral-800 text-gray-400 font-medium rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={isSubmitting || pendingItems.filter(i => i.status === 'pending').length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add All'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
