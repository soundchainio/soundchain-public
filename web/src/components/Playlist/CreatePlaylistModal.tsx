'use client'

import { useState } from 'react'
import { X, Music, ImagePlus, Loader2 } from 'lucide-react'
import { useCreatePlaylistMutation } from 'lib/graphql'

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (playlistId: string) => void
}

export const CreatePlaylistModal = ({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createPlaylist] = useCreatePlaylistMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Please enter a playlist name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createPlaylist({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim() || null,
          },
        },
        // Use 'all' errorPolicy to get data even with partial GraphQL errors
        // (e.g., non-critical field resolver issues)
        errorPolicy: 'all',
      })

      // Check for successful playlist creation even if there are partial errors
      if (result.data?.createPlaylist?.playlist?.id) {
        onSuccess?.(result.data.createPlaylist.playlist.id)
        setTitle('')
        setDescription('')
        onClose()
      } else if (result.errors?.length) {
        console.error('GraphQL errors:', result.errors)
        setError('Failed to create playlist. Please try again.')
      }
    } catch (err) {
      console.error('Failed to create playlist:', err)
      setError('Failed to create playlist. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl border border-pink-500/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Create Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cover Image Placeholder */}
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-xl bg-neutral-800 border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition-colors">
              <ImagePlus className="w-8 h-8 text-neutral-500 mb-2" />
              <span className="text-neutral-500 text-xs">Add cover (optional)</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Playlist Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Playlist"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={3}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
              maxLength={500}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-800 text-gray-400 font-medium rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Playlist'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
