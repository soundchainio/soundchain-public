import React from 'react'
import { LinkItUrl } from 'react-linkify-it'

interface EmoteRendererProps {
  text: string
  className?: string
  linkify?: boolean
}

// Regex to match our custom emote format: ![emote:name](url)
// Also handles the common typo [!emote:name](url) where ! is inside brackets
const EMOTE_REGEX = /!?\[!?emote:([^\]]+)\]\(([^)]+)\)/g

/**
 * Renders text with inline animated emotes
 * Converts ![emote:name](url) to actual <img> tags
 */
export const EmoteRenderer = ({ text, className = '', linkify = false }: EmoteRendererProps) => {
  if (!text) return null

  // Check if text contains any emotes (both correct and typo formats)
  if (!text.includes('![emote:') && !text.includes('[!emote:') && !text.includes('[emote:')) {
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

    // Add the emote image with retry logic for different URL formats
    parts.push(
      <img
        key={`emote-${match.index}`}
        src={emoteUrl}
        alt={emoteName}
        title={emoteName}
        className="inline-block w-7 h-7 align-middle mx-0.5"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          const currentSrc = target.src

          // Try different formats: base -> .webp -> .gif -> .png -> text fallback
          // 7TV and other CDNs often support multiple formats
          if (!currentSrc.includes('.webp') && !currentSrc.includes('.gif') && !currentSrc.includes('.png')) {
            // Base URL failed, try .webp
            target.src = currentSrc + '.webp'
          } else if (currentSrc.endsWith('.webp')) {
            // .webp failed, try .gif
            target.src = currentSrc.replace('.webp', '.gif')
          } else if (currentSrc.endsWith('.gif')) {
            // .gif failed, try .png
            target.src = currentSrc.replace('.gif', '.png')
          } else {
            // All formats failed - show text fallback
            target.style.display = 'none'
            const fallback = document.createElement('span')
            fallback.className = 'inline-block px-1 py-0.5 text-xs bg-neutral-700 rounded text-cyan-400'
            fallback.textContent = `:${emoteName}:`
            target.parentNode?.insertBefore(fallback, target.nextSibling)
          }
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
