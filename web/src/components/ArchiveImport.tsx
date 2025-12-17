/**
 * ArchiveImport Component
 *
 * Allows users to import previously archived posts (.soundchain files)
 * and repost them to the feed.
 *
 * Web3 Philosophy: YOUR archive, YOUR control - repost anytime!
 */

import React, { useState, useRef, useCallback } from 'react'
import { readPostArchive, isValidArchiveFile, PostArchiveMetadata } from 'lib/postArchive'
import { Archive, Upload, X, Image, Video, Music, FileText, Calendar, User, Heart, MessageCircle, Repeat } from 'lucide-react'
import { toast } from 'react-toastify'

interface ArchiveImportProps {
  onImport: (data: {
    metadata: PostArchiveMetadata
    mediaBlob?: Blob
    mediaObjectUrl?: string
  }) => void
  onCancel?: () => void
  className?: string
}

export function ArchiveImport({ onImport, onCancel, className = '' }: ArchiveImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<{
    metadata: PostArchiveMetadata
    mediaBlob?: Blob
    mediaObjectUrl?: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!isValidArchiveFile(file)) {
      toast.error('Invalid archive file. Please select a .soundchain or .zip file.')
      return
    }

    setIsLoading(true)
    try {
      const { metadata, mediaBlob } = await readPostArchive(file)

      // Create object URL for media preview
      let mediaObjectUrl: string | undefined
      if (mediaBlob) {
        mediaObjectUrl = URL.createObjectURL(mediaBlob)
      }

      setPreview({ metadata, mediaBlob, mediaObjectUrl })
    } catch (err: any) {
      console.error('Failed to read archive:', err)
      toast.error(err.message || 'Failed to read archive file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleImport = useCallback(() => {
    if (preview) {
      onImport(preview)
    }
  }, [preview, onImport])

  const handleClearPreview = useCallback(() => {
    if (preview?.mediaObjectUrl) {
      URL.revokeObjectURL(preview.mediaObjectUrl)
    }
    setPreview(null)
  }, [preview])

  const getMediaIcon = (type: string | null) => {
    switch (type) {
      case 'image': return <Image className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      case 'audio': return <Music className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Preview mode
  if (preview) {
    return (
      <div className={`bg-neutral-900 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-500" />
            Archive Preview
          </h3>
          <button
            onClick={handleClearPreview}
            className="p-1 hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Author info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-400" />
            </div>
            <div>
              <p className="text-white font-medium">{preview.metadata.profile.displayName}</p>
              <p className="text-neutral-400 text-sm">@{preview.metadata.profile.userHandle}</p>
            </div>
          </div>

          {/* Post body */}
          {preview.metadata.body && (
            <p className="text-neutral-200 whitespace-pre-wrap">{preview.metadata.body}</p>
          )}

          {/* Media preview */}
          {preview.mediaObjectUrl && preview.metadata.mediaType && (
            <div className="rounded-lg overflow-hidden bg-neutral-800">
              {preview.metadata.mediaType === 'image' && (
                <img
                  src={preview.mediaObjectUrl}
                  alt="Archived media"
                  className="w-full h-auto max-h-96 object-contain"
                />
              )}
              {preview.metadata.mediaType === 'video' && (
                <video
                  src={preview.mediaObjectUrl}
                  controls
                  className="w-full max-h-96"
                />
              )}
              {preview.metadata.mediaType === 'audio' && (
                <div className="p-4">
                  <audio src={preview.mediaObjectUrl} controls className="w-full" />
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Originally posted: {formatDate(preview.metadata.originalCreatedAt)}</span>
            </div>
            {preview.metadata.mediaType && (
              <div className="flex items-center gap-1">
                {getMediaIcon(preview.metadata.mediaType)}
                <span className="capitalize">{preview.metadata.mediaType}</span>
              </div>
            )}
          </div>

          {/* Stats from when archived */}
          {preview.metadata.stats && (
            <div className="flex gap-4 text-sm text-neutral-400 pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{preview.metadata.stats.reactions} reactions</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{preview.metadata.stats.comments} comments</span>
              </div>
              <div className="flex items-center gap-1">
                <Repeat className="w-4 h-4" />
                <span>{preview.metadata.stats.reposts} reposts</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-neutral-800/50 flex gap-3">
          <button
            onClick={handleClearPreview}
            className="flex-1 py-2 px-4 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="flex-1 py-2 px-4 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Repost to Feed
          </button>
        </div>
      </div>
    )
  }

  // Upload mode
  return (
    <div className={`bg-neutral-900 rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Archive className="w-5 h-5 text-amber-500" />
          Import Archive
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        )}
      </div>

      <div
        className={`p-8 border-2 border-dashed m-4 rounded-lg transition-colors ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-neutral-700 hover:border-neutral-600'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".soundchain,.zip"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center">
          {isLoading ? (
            <>
              <Archive className="w-12 h-12 text-amber-500 animate-pulse mb-4" />
              <p className="text-neutral-300">Reading archive...</p>
            </>
          ) : (
            <>
              <Archive className="w-12 h-12 text-neutral-500 mb-4" />
              <p className="text-neutral-300 mb-2">
                Drag and drop your archive file here
              </p>
              <p className="text-neutral-500 text-sm mb-4">
                Supports .soundchain and .zip files
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
              >
                Browse Files
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 text-center text-neutral-500 text-sm">
        <p>Re-upload your archived 24-hour posts anytime!</p>
      </div>
    </div>
  )
}

export default ArchiveImport
