import React from 'react'
import { LinkItUrl } from 'react-linkify-it'

interface EmoteRendererProps {
  text: string
  className?: string
  linkify?: boolean
}

// Regex to match our custom emote format: ![emote:name](url)
// Also handles the common typo [!emote:name](url) where ! is inside brackets
// Made more robust to handle various URL formats including .webp, .gif, etc.
const EMOTE_REGEX = /!?\[!?emote:([^\]]+)\]\(([^)\s]+)\)/g

// Additional regex to catch any markdown image from emote CDNs (7tv, bttv, ffz)
// This handles cases where the format might not have "emote:" prefix
const CDN_IMAGE_REGEX = /!\[([^\]]*)\]\((https?:\/\/(?:cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com)[^)\s]+)\)/gi

/**
 * Renders text with inline animated emotes
 * Converts ![emote:name](url) to actual <img> tags
 */
export const EmoteRenderer = ({ text, className = '', linkify = false }: EmoteRendererProps) => {
  if (!text) return null

  // Check if text contains any emotes (both correct and typo formats)
  // Also check for markdown image syntax with emote-like URLs (7tv, bttv, ffz)
  const hasEmoteMarkdown = text.includes('![emote:') || text.includes('[!emote:') || text.includes('[emote:')
  const hasEmoteCDN = /!\[[^\]]*\]\([^)]*(?:7tv\.app|betterttv\.net|frankerfacez\.com)[^)]*\)/i.test(text)

  if (!hasEmoteMarkdown && !hasEmoteCDN) {
    // No emotes - just linkify if needed
    if (linkify) {
      return (
        <LinkItUrl className="text-cyan-400 hover:underline">
          <span className={className}>{text}</span>
        </LinkItUrl>
      )
    }
    return <span className={className}>{text}</span>
  }

  // Combine both regexes - first try the emote format, then CDN images
  // Create a unified regex that matches both patterns
  const COMBINED_REGEX = /!?\[!?(?:emote:)?([^\]]*)\]\(((?:https?:\/\/)?[^)\s]+)\)/gi

  // Split text and replace emotes with images
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  // Reset regex
  COMBINED_REGEX.lastIndex = 0

  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    const fullMatch = match[0]
    const emoteName = match[1] || 'emote'
    const emoteUrl = match[2]

    // Only render as image if it looks like an emote URL (has CDN domain or image extension)
    const isEmoteUrl = /(?:7tv\.app|betterttv\.net|frankerfacez\.com|\.(?:gif|webp|png|jpg|jpeg))/i.test(emoteUrl)

    if (!isEmoteUrl) {
      // Not an emote URL, skip this match
      continue
    }

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

    // Add the emote image with error handling
    parts.push(
      <img
        key={`emote-${match.index}`}
        src={emoteUrl}
        alt={emoteName}
        title={emoteName}
        className="inline-block w-7 h-7 align-middle mx-0.5"
        loading="lazy"
        onError={(e) => {
          // On error, replace with emote name as fallback
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const fallback = document.createElement('span')
          fallback.className = 'inline-block px-1 py-0.5 text-xs bg-neutral-700 rounded text-cyan-400'
          fallback.textContent = `:${emoteName}:`
          target.parentNode?.insertBefore(fallback, target.nextSibling)
        }}
      />
    )

    lastIndex = match.index + fullMatch.length
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

  // If no emotes were found (all matches were skipped), return original text
  if (parts.length === 0) {
    if (linkify) {
      return (
        <LinkItUrl className="text-cyan-400 hover:underline">
          <span className={className}>{text}</span>
        </LinkItUrl>
      )
    }
    return <span className={className}>{text}</span>
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
