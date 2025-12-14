import React from 'react'

interface EmoteRendererProps {
  text: string
  className?: string
}

// Regex to match our custom emote format: ![emote:name](url)
const EMOTE_REGEX = /!\[emote:([^\]]+)\]\(([^)]+)\)/g

/**
 * Renders text with inline animated emotes
 * Converts ![emote:name](url) to actual <img> tags
 */
export const EmoteRenderer = ({ text, className = '' }: EmoteRendererProps) => {
  if (!text) return null

  // Check if text contains any emotes
  if (!text.includes('![emote:')) {
    return <span className={className}>{text}</span>
  }

  // Split text and replace emotes with images
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  // Reset regex
  EMOTE_REGEX.lastIndex = 0

  while ((match = EMOTE_REGEX.exec(text)) !== null) {
    // Add text before the emote
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const emoteName = match[1]
    const emoteUrl = match[2]

    // Add the emote image
    parts.push(
      <img
        key={`emote-${match.index}`}
        src={emoteUrl}
        alt={emoteName}
        title={emoteName}
        className="inline-block w-6 h-6 align-middle mx-0.5"
        loading="lazy"
      />
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last emote
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <span className={className}>{parts}</span>
}

/**
 * Renders text with emotes, wrapped in a paragraph for posts
 */
export const PostBodyWithEmotes = ({ body, className = '' }: { body: string; className?: string }) => {
  if (!body) return null

  // Split by newlines to preserve formatting
  const lines = body.split('\n')

  return (
    <p className={className}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          <EmoteRenderer text={line} />
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  )
}
