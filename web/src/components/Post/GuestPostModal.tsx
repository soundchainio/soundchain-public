import React, { useState } from 'react'
import { X } from 'lucide-react'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { useGuestCreatePostMutation } from 'lib/graphql'

interface GuestPostModalProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
}

export const GuestPostModal = ({ isOpen, onClose, walletAddress }: GuestPostModalProps) => {
  const [body, setBody] = useState('')
  const [mediaLink, setMediaLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [guestCreatePost] = useGuestCreatePostMutation({
    refetchQueries: ['Posts'],
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!body.trim()) {
      setError('Please enter some text for your post')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await guestCreatePost({
        variables: {
          input: {
            body: body.trim(),
            mediaLink: mediaLink.trim() || undefined,
          },
          walletAddress,
        },
      })

      // Success - close modal and reset form
      setBody('')
      setMediaLink('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-neutral-900 rounded-2xl border border-cyan-500/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <GuestAvatar walletAddress={walletAddress} pixels={40} editable className="ring-2 ring-cyan-500/50" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-100">
                  {formatWalletAddress(walletAddress)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-medium">
                  Guest
                </span>
              </div>
              <p className="text-xs text-neutral-500">Posting as guest</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {/* Body textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
              maxLength={500}
            />

            {/* Character count */}
            <div className="flex justify-end">
              <span className={`text-xs ${body.length > 450 ? 'text-yellow-400' : 'text-neutral-500'}`}>
                {body.length}/500
              </span>
            </div>

            {/* Media link input */}
            <input
              type="url"
              value={mediaLink}
              onChange={(e) => setMediaLink(e.target.value)}
              placeholder="Add a link (YouTube, Spotify, etc.)"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
            />

            {/* Info box */}
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <p className="text-xs text-cyan-400">
                <strong>Guest posting:</strong> Your post will be associated with your wallet address.
                Sign up for a SoundChain account to unlock all features and lower marketplace fees!
              </p>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !body.trim()}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
