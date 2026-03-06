import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle, Smile, Sparkles, Film, Video } from 'lucide-react'
import { Button } from 'components/ui/button'
import { useSendMessageMutation, useChatHistoryLazyQuery, Profile } from 'lib/graphql'
import { Avatar } from 'components/Avatar'
import { useMe } from 'hooks/useMe'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { StickerPicker } from 'components/StickerPicker'
import { GifPicker } from 'components/GifPicker'
import { CreateStoryModal } from 'components/dex/CreateStoryModal'
import Picker from '@emoji-mart/react'
import { formatDistanceToNow } from 'date-fns'

interface Emoji {
  id: string
  name: string
  native: string
}

interface DMModalProps {
  show: boolean
  onClose: () => void
  recipientProfile: {
    id: string
    displayName?: string | null
    userHandle?: string | null
    profilePicture?: string | null
  }
}

export const DMModal = ({ show, onClose, recipientProfile }: DMModalProps) => {
  const me = useMe()
  const [messageText, setMessageText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [loadChatHistory, { data: chatData, loading: chatLoading, refetch }] = useChatHistoryLazyQuery({
    fetchPolicy: 'network-only',
  })

  const [sendMessage, { loading: sending }] = useSendMessageMutation({
    onCompleted: () => {
      setMessageText('')
      setShowEmojiPicker(false)
      setShowStickerPicker(false)
      setShowGifPicker(false)
      refetch?.()
    },
  })

  // Load chat history when modal opens
  useEffect(() => {
    if (show && recipientProfile.id) {
      loadChatHistory({ variables: { profileId: recipientProfile.id } })
    }
  }, [show, recipientProfile.id, loadChatHistory])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatData?.chatHistory?.nodes])

  const handleSend = async () => {
    if (!messageText.trim() || !recipientProfile.id) return

    await sendMessage({
      variables: {
        input: {
          message: messageText.trim(),
          toId: recipientProfile.id,
        },
      },
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!show) return null

  const messages = chatData?.chatHistory?.nodes || []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:w-[450px] max-h-[80vh] bg-neutral-900 border border-cyan-500/30 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-500">
              {recipientProfile.profilePicture ? (
                <img src={recipientProfile.profilePicture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {recipientProfile.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-semibold">{recipientProfile.displayName || 'User'}</p>
              <p className="text-cyan-400 text-sm">@{recipientProfile.userHandle}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          {chatLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoaderAnimation loadingMessage="Loading messages..." />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation!</p>
            </div>
          ) : (
            <>
              {[...messages].reverse().map((message) => {
                const isMe = message.from?.id === me?.profile?.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                          : 'bg-purple-500/20 border border-purple-500/30 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Pickers - above input */}
        {showEmojiPicker && (
          <div className="px-4 pb-2">
            <Picker
              theme="dark"
              perLine={8}
              onEmojiSelect={(emoji: Emoji) => {
                setMessageText(prev => prev + emoji.native)
              }}
            />
          </div>
        )}
        {showStickerPicker && (
          <div className="px-4 pb-2">
            <StickerPicker
              theme="dark"
              onSelect={(stickerUrl, stickerName) => {
                const emoteMarkdown = `![emote:${stickerName}](${stickerUrl})`
                setMessageText(prev => prev + emoteMarkdown)
              }}
            />
          </div>
        )}
        {showGifPicker && (
          <div className="px-4 pb-2">
            <GifPicker
              theme="dark"
              onClose={() => setShowGifPicker(false)}
              onSelect={(gifUrl, gifTitle) => {
                const gifMarkdown = `![emote:gif:${gifTitle}](${gifUrl})`
                setMessageText(prev => prev + gifMarkdown)
              }}
            />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-cyan-500/20">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-neutral-800 border border-cyan-500/20 rounded-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              className="bg-cyan-500 hover:bg-cyan-600 rounded-full w-10 h-10 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {/* Toolbar pills */}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); setShowGifPicker(false) }}
              className={`p-1 rounded-lg transition-all ${
                showEmojiPicker
                  ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-400'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
              title="Add emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); setShowGifPicker(false) }}
              className={`p-1 rounded-lg transition-all ${
                showStickerPicker
                  ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
              title="Add stickers"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); setShowStickerPicker(false) }}
              className={`p-1 rounded-lg transition-all ${
                showGifPicker
                  ? 'bg-pink-500/20 text-pink-400 ring-1 ring-pink-400'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
              title="Search GIFs"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowStoryModal(true)}
              className="p-1 rounded-lg transition-all bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-cyan-400"
              title="Create Story / Reel"
            >
              <Video className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Story Modal */}
      {showStoryModal && (
        <CreateStoryModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
        />
      )}
    </div>
  )
}

export default DMModal
