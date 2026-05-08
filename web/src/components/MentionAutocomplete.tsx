/**
 * MentionAutocomplete — @mention user search dropdown
 *
 * Shows a dropdown of matching users when typing @handle in any text input.
 * Used by PostFormTimeline, NewCommentForm, ProfileWall comment forms.
 */

import { useState, useEffect, useRef } from 'react'
import { useExploreUsersLazyQuery } from 'lib/graphql'
import { Avatar } from './Avatar'

interface MentionAutocompleteProps {
  text: string
  cursorPosition: number
  onSelect: (handle: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
}

export function MentionAutocomplete({ text, cursorPosition, onSelect, inputRef }: MentionAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState(false)
  const [searchUsers, { data, loading }] = useExploreUsersLazyQuery({ fetchPolicy: 'cache-first' })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Detect @mention being typed
  useEffect(() => {
    const before = text.slice(0, cursorPosition)
    const match = before.match(/@(\w{1,24})$/)
    if (match) {
      const q = match[1]
      setQuery(q)
      setShow(true)
      if (q.length >= 1) {
        searchUsers({ variables: { search: q, page: { first: 8 } } })
      }
    } else {
      setShow(false)
      setQuery('')
    }
  }, [text, cursorPosition, searchUsers])

  if (!show || !query) return null

  const users = data?.exploreUsers?.nodes || []
  if (users.length === 0 && !loading) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
    >
      {loading && (
        <div className="px-3 py-2 text-xs text-gray-500">Searching...</div>
      )}
      {users.map((user: any) => (
        <button
          key={user.id}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
          onMouseDown={(e) => {
            e.preventDefault() // Prevent input blur
            onSelect(user.userHandle || user.displayName)
          }}
        >
          <Avatar
            profile={{ profilePicture: user.profilePicture, userHandle: user.userHandle } as any}
            pixels={24}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white truncate block">{user.displayName}</span>
            {user.userHandle && (
              <span className="text-xs text-gray-400">@{user.userHandle}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

/**
 * Render text with @mentions as clickable links
 */
export function renderMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@\w{2,24})/g)
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length >= 3) {
      const handle = part.slice(1)
      return (
        <a
          key={i}
          href={`/users/${handle}`}
          className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}
