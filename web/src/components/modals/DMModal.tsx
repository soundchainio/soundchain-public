import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { Button } from 'components/ui/button'
import { useSendMessageMutation, useChatHistoryLazyQuery, Profile } from 'lib/graphql'
import { Avatar } from 'components/Avatar'
import { useMe } from 'hooks/useMe'
import { LoaderAnimation } from 'components/LoaderAnimation'
import { formatDistanceToNow } from 'date-fns'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [loadChatHistory, { data: chatData, loading: chatLoading, refetch }] = useChatHistoryLazyQuery({
    fetchPolicy: 'network-only',
  })

  const [sendMessage, { loading: sending }] = useSendMessageMutation({
    onCompleted: () => {
      setMessageText('')
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
        </div>
      </div>
    </div>
  )
}

export default DMModal
