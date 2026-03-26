import React from 'react'
import { LinkItUrl } from 'react-linkify-it'

// Render @mentions as clickable profile links
function renderWithMentions(text: string, keyPrefix: string = ''): React.ReactNode[] {
  const parts = text.split(/(@\w{2,24})/g)
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length >= 3) {
      const handle = part.slice(1)
      return (
        <a
          key={`${keyPrefix}mention-${i}`}
          href={`/dex/users/${handle}`}
          className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return <React.Fragment key={`${keyPrefix}text-${i}`}>{part}</React.Fragment>
  })
}

interface EmoteRendererProps {
  text: string
  className?: string
  linkify?: boolean
}

// Regex to match our custom emote format: ![emote:name](url)
// Also handles the common typo [!emote:name](url) where ! is inside brackets
const EMOTE_REGEX = /!?\[!?emote:([^\]]+)\]\(([^)]+)\)/g

// Standalone GIF: entire text is a single GIF emote with no other content
const STANDALONE_GIF_REGEX = /^\s*!?\[!?emote:gif:([^\]]+)\]\(([^)]+)\)\s*$/

/**
 * Renders text with inline animated emotes
 * Converts ![emote:name](url) to actual <img> tags
 * GIFs (gif: prefix) render as full-size block when they ARE the content
 */
export const EmoteRenderer = ({ text, className = '', linkify = false }: EmoteRendererProps) => {
  if (!text) return null

  // Check for standalone GIF — entire text is just one GIF emote, render full-size
  const standaloneGif = STANDALONE_GIF_REGEX.exec(text)
  if (standaloneGif) {
    const gifTitle = standaloneGif[1]
    const gifUrl = standaloneGif[2]
    return (
      <span className={className}>
        <img
          src={gifUrl}
          alt={gifTitle}
          title={gifTitle}
          className="block max-w-[280px] sm:max-w-[360px] max-h-[320px] rounded-xl object-contain my-1"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const fallback = document.createElement('span')
            fallback.className = 'inline-block px-1 py-0.5 text-xs bg-neutral-700 rounded text-cyan-400'
            fallback.textContent = `[GIF: ${gifTitle}]`
            target.parentNode?.insertBefore(fallback, target.nextSibling)
          }}
        />
      </span>
    )
  }

  // Check if text contains any emotes (both correct and typo formats)
  if (!text.includes('![emote:') && !text.includes('[!emote:') && !text.includes('[emote:')) {
    // No emotes — render @mentions + linkify if needed
    const hasMentions = /@\w{2,24}/.test(text)
    if (linkify) {
      return (
        <LinkItUrl className="text-cyan-400 hover:underline">
          <span className={className}>{hasMentions ? renderWithMentions(text) : text}</span>
        </LinkItUrl>
      )
    }
    return <span className={className}>{hasMentions ? renderWithMentions(text) : text}</span>
  }

  // Split text and replace emotes with images
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  // Reset regex
  EMOTE_REGEX.lastIndex = 0

  while ((match = EMOTE_REGEX.exec(text)) !== null) {
    // Add text before the emote (with linkification if enabled)
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index)
      if (linkify) {
        parts.push(
          <LinkItUrl key={`link-${lastIndex}`} className="text-cyan-400 hover:underline">
            {textBefore}
          </LinkItUrl>
        )
      } else {
        parts.push(textBefore)
      }
    }

    const emoteName = match[1]
    const emoteUrl = match[2]
    const isGif = emoteName.startsWith('gif:')

    // GIFs inline with text: slightly larger than emotes but still inline
    // Regular emotes: standard 28px
    const imgClass = isGif
      ? 'inline-block w-9 h-9 align-middle mx-0.5 rounded'
      : 'inline-block w-7 h-7 align-middle mx-0.5'

    // Add the emote image with retry logic for different URL formats
    parts.push(
      <img
        key={`emote-${match.index}`}
        src={emoteUrl}
        alt={emoteName}
        title={isGif ? emoteName.replace('gif:', '') : emoteName}
        className={imgClass}
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          const currentSrc = target.src

          // 7TV CDN works best without extensions - strip them first
          // Pattern: https://cdn.7tv.app/emote/ID/2x or https://cdn.7tv.app/emote/ID/2x.ext
          const is7TV = currentSrc.includes('cdn.7tv.app')

          if (is7TV) {
            // For 7TV: strip any extension and let CDN auto-serve
            const baseUrl = currentSrc.replace(/\.(gif|webp|png)$/, '')
            if (currentSrc !== baseUrl) {
              // Had an extension, try without it
              target.src = baseUrl
              return
            }
            // Already tried without extension, show fallback
          } else {
            // Non-7TV: try different formats
            if (!currentSrc.includes('.webp') && !currentSrc.includes('.gif') && !currentSrc.includes('.png')) {
              target.src = currentSrc + '.webp'
              return
            } else if (currentSrc.endsWith('.webp')) {
              target.src = currentSrc.replace('.webp', '.gif')
              return
            } else if (currentSrc.endsWith('.gif')) {
              target.src = currentSrc.replace('.gif', '.png')
              return
            }
          }

          // All formats failed - show text fallback
          target.style.display = 'none'
          const fallback = document.createElement('span')
          fallback.className = 'inline-block px-1 py-0.5 text-xs bg-neutral-700 rounded text-cyan-400'
          fallback.textContent = `:${emoteName}:`
          target.parentNode?.insertBefore(fallback, target.nextSibling)
        }}
      />
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last emote (with linkification if enabled)
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex)
    if (linkify) {
      parts.push(
        <LinkItUrl key={`link-${lastIndex}`} className="text-cyan-400 hover:underline">
          {textAfter}
        </LinkItUrl>
      )
    } else {
      parts.push(textAfter)
    }
  }

  return <span className={className}>{parts}</span>
}

interface PostBodyWithEmotesProps {
  body: string
  className?: string
  linkify?: boolean
}

/**
 * Renders text with emotes, wrapped in a paragraph for posts
 */
export const PostBodyWithEmotes = ({ body, className = '', linkify = false }: PostBodyWithEmotesProps) => {
  if (!body) return null

  // Split by newlines to preserve formatting
  const lines = body.split('\n')

  return (
    <p className={className}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          <EmoteRenderer text={line} linkify={linkify} />
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  )
}
