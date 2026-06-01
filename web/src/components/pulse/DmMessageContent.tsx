/**
 * DmMessageContent — Renders DM messages with inline emotes and embedded GIFs
 *
 * - Detects emote names (PogU, POGGERS, catJAM, etc.) and renders as 7TV/BTTV images
 * - Detects GIF URLs (giphy, tenor, media*.giphy) and renders as embedded images
 * - Linkifies other URLs
 */

import React from 'react'
import { embedForUrl } from 'components/Post/MessageBody'

// Emote name → 7TV emote ID mapping (most popular emotes)
const EMOTE_MAP: Record<string, string> = {
  catJAM: '60aec9186d0b8c60ac0be7c0',
  pepeD: '60ae8cac229664e8667ae5a8',
  NODDERS: '60afe3c580df1e6b58fd7f3f',
  Clap: '60aed15c8ed8b373e421e8e1',
  peepoClap: '60b0d3fba5de6cf21b5ea85e',
  HYPERS: '60b0d3b4daa8fb57cd62c5d8',
  Prayge: '60b0d3fba5de6cf21b5ea85f',
  KEKW: '60aeab29229664e8667ae492',
  LULW: '60aeab47229664e8667ae499',
  OMEGALUL: '60b0d3ec8ed8b373e421e7a7',
  EZ: '60b0d42c8ed8b373e421e7b5',
  PogU: '60b0d3d4a5de6cf21b5ea84e',
  Sadge: '60b0d42c8ed8b373e421e7b6',
  Copium: '60b0d410a5de6cf21b5ea856',
  PepeLaugh: '60b0d3a7a5de6cf21b5ea83b',
  monkaS: '60b0d3c3daa8fb57cd62c5db',
  FeelsGoodMan: '60b0d3a7a5de6cf21b5ea83b',
  FeelsBadMan: '60b0d3b4daa8fb57cd62c5d7',
  peepoHappy: '60b0d41ba5de6cf21b5ea858',
  peepoSad: '60b0d427daa8fb57cd62c5e4',
  GIGACHAD: '60b0d3fba5de6cf21b5ea860',
  BASED: '60b0d410a5de6cf21b5ea857',
  DESPAIR: '60b0d42c8ed8b373e421e7b7',
  NOTED: '60b0d427daa8fb57cd62c5e5',
  CAUGHT: '60b0d42c8ed8b373e421e7b8',
  FeelsStrongMan: '60b0d410a5de6cf21b5ea855',
  peepoArrive: '60b0d427daa8fb57cd62c5e3',
  POGGERS: '60b0d3d4a5de6cf21b5ea84f',
  LETSGO: '60b0d42c8ed8b373e421e7b9',
  Madge: '60b0d427daa8fb57cd62c5e6',
  Pepepls: '60b0d410a5de6cf21b5ea854',
  PETTHE: '60b0d427daa8fb57cd62c5e7',
  Chatting: '60b0d42c8ed8b373e421e7ba',
  lebronJAM: '60b0d3fba5de6cf21b5ea861',
  WideHard: '60b0d3b4daa8fb57cd62c5d9',
  HACKERMANS: '60b0d3c3daa8fb57cd62c5dc',
  WeirdChamp: '60b0d3d4a5de6cf21b5ea850',
}

// GIF URL patterns
const GIF_URL_REGEX = /https?:\/\/(?:media\d?\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)[^\s)]+/gi
const URL_REGEX = /https?:\/\/[^\s]+/g

// Build emote name regex from map keys (case-sensitive, word boundary)
const emoteNames = Object.keys(EMOTE_MAP).sort((a, b) => b.length - a.length) // Longest first
const EMOTE_NAME_REGEX = new RegExp(`\\b(${emoteNames.join('|')})\\b`, 'g')

interface DmMessageContentProps {
  text: string
  isMe?: boolean
}

export function DmMessageContent({ text, isMe }: DmMessageContentProps) {
  if (!text) return null

  // Split text into lines to handle GIF URLs on their own lines
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim()

    // Check if this line is a standalone GIF URL
    const gifMatch = trimmed.match(/^https?:\/\/(?:media\d?\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)[^\s)]+$/i)
    if (gifMatch) {
      elements.push(
        <img
          key={`gif-${lineIdx}`}
          src={gifMatch[0]}
          alt="GIF"
          className="max-w-[260px] max-h-[200px] rounded-xl object-contain my-1"
          loading="lazy"
        />
      )
      return
    }

    // Standalone URL (non-GIF) — render a RICH EMBED if it's a SoundChain post /
    // NFT / SCID post / X / YouTube / image; otherwise a clickable link.
    if (/^https?:\/\/[^\s]+$/.test(trimmed) && !gifMatch) {
      const embed = embedForUrl(trimmed, `embed-${lineIdx}`)
      if (embed) {
        elements.push(embed)
        return
      }
      elements.push(
        <a
          key={`link-${lineIdx}`}
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm underline ${isMe ? 'text-black/80' : 'text-cyan-400'}`}
        >
          {trimmed}
        </a>
      )
      if (lineIdx < lines.length - 1) elements.push(<br key={`br-${lineIdx}`} />)
      return
    }

    // Skip empty lines but preserve spacing
    if (!trimmed) {
      elements.push(<br key={`br-${lineIdx}`} />)
      return
    }

    // Process line for inline emotes
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const matches = [...trimmed.matchAll(EMOTE_NAME_REGEX)]

    if (matches.length === 0) {
      // No emotes — render as plain text with inline GIF detection
      const inlineGifs = [...trimmed.matchAll(GIF_URL_REGEX)]
      if (inlineGifs.length > 0) {
        let gi = 0
        for (const gm of inlineGifs) {
          if (gm.index! > gi) {
            parts.push(<span key={`t-${lineIdx}-${gi}`}>{trimmed.slice(gi, gm.index!)}</span>)
          }
          parts.push(
            <img
              key={`ig-${lineIdx}-${gm.index}`}
              src={gm[0]}
              alt="GIF"
              className="inline-block max-w-[200px] max-h-[150px] rounded-lg object-contain mx-1 align-middle"
              loading="lazy"
            />
          )
          gi = gm.index! + gm[0].length
        }
        if (gi < trimmed.length) {
          parts.push(<span key={`t-${lineIdx}-end`}>{trimmed.slice(gi)}</span>)
        }
      } else {
        parts.push(<span key={`text-${lineIdx}`}>{trimmed}</span>)
      }
    } else {
      for (const match of matches) {
        // Add text before emote
        if (match.index! > lastIndex) {
          parts.push(<span key={`t-${lineIdx}-${lastIndex}`}>{trimmed.slice(lastIndex, match.index!)}</span>)
        }
        // Add emote image
        const emoteName = match[1]
        const emoteId = EMOTE_MAP[emoteName]
        parts.push(
          <img
            key={`e-${lineIdx}-${match.index}`}
            src={`https://cdn.7tv.app/emote/${emoteId}/2x.webp`}
            alt={emoteName}
            title={emoteName}
            className="inline-block w-7 h-7 align-middle mx-0.5"
            loading="lazy"
          />
        )
        lastIndex = match.index! + match[0].length
      }
      // Remaining text after last emote
      if (lastIndex < trimmed.length) {
        parts.push(<span key={`t-${lineIdx}-end`}>{trimmed.slice(lastIndex)}</span>)
      }
    }

    elements.push(<span key={`line-${lineIdx}`}>{parts}</span>)
    if (lineIdx < lines.length - 1) elements.push(<br key={`br-${lineIdx}`} />)
  })

  return <p className="text-sm leading-relaxed break-words">{elements}</p>
}
