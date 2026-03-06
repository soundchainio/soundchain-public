import React, { useRef, useEffect, useCallback } from 'react'

interface EmoteTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
}

// Regex pattern for our custom emote format: ![emote:name](url)
// Note: Create fresh regex instances in functions to avoid global flag lastIndex issues
const EMOTE_PATTERN = '!\\[emote:([^\\]]+)\\]\\(([^)]+)\\)'

/**
 * Get display length - counts emotes as 1 character each
 * This is used for character limit validation
 */
export const getDisplayLength = (text: string): number => {
  if (!text) return 0
  // Replace each emote with a single placeholder character for counting
  const emoteRegex = new RegExp(EMOTE_PATTERN, 'g')
  const textWithEmotesAsOne = text.replace(emoteRegex, '🔲')
  // Count graphemes (handles unicode emojis correctly)
  const splitter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' })
  return [...splitter.segment(textWithEmotesAsOne)].length
}

/**
 * Converts markdown emote format to HTML img tags for display
 */
const markdownToHtml = (text: string): string => {
  if (!text) return ''

  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Convert emote markdown to img tags (create fresh regex to avoid lastIndex issues)
  const emoteRegex = new RegExp(EMOTE_PATTERN, 'g')
  html = html.replace(emoteRegex, (_, name, url) => {
    // Decode the URL in case it was escaped
    const decodedUrl = url.replace(/&amp;/g, '&')
    return `<img src="${decodedUrl}" alt="${name}" title="${name}" class="inline-block w-6 h-6 align-middle mx-0.5" draggable="false" />`
  })

  // Convert newlines to br tags
  html = html.replace(/\n/g, '<br>')

  return html
}

/**
 * Converts HTML back to markdown format (extracts text and img srcs)
 */
const htmlToMarkdown = (html: string): string => {
  // Create a temporary div to parse HTML
  const div = document.createElement('div')
  div.innerHTML = html

  let result = ''

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ''
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement

      if (element.tagName === 'IMG') {
        const src = element.getAttribute('src') || ''
        const alt = element.getAttribute('alt') || 'emote'
        result += `![emote:${alt}](${src})`
      } else if (element.tagName === 'BR') {
        result += '\n'
      } else if (element.tagName === 'DIV' && result.length > 0 && !result.endsWith('\n')) {
        // Divs often represent new lines in contenteditable
        result += '\n'
        element.childNodes.forEach(processNode)
      } else {
        element.childNodes.forEach(processNode)
      }
    }
  }

  div.childNodes.forEach(processNode)

  return result
}

/**
 * Rich text input that renders emotes inline
 * Uses contenteditable div to allow mixed text and images
 */
export const EmoteTextInput = ({
  value,
  onChange,
  placeholder = '',
  maxLength = 1000,
  className = '',
}: EmoteTextInputProps) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const isComposing = useRef(false)
  const lastValueRef = useRef(value)

  // Update editor content when value changes externally (e.g., emote insertion)
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      const html = markdownToHtml(value)
      const wasContentAdded = value.length > lastValueRef.current.length

      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html
        lastValueRef.current = value

        // If content was added (like emote insertion), move cursor to end
        // On mobile: DON'T focus to avoid keyboard popup - allows emoji flurries!
        // On desktop: focus and position cursor for seamless typing
        if (wasContentAdded) {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                           (typeof window !== 'undefined' && window.innerWidth < 768)

          if (!isMobile) {
            // Desktop: focus and position cursor at end
            editorRef.current.focus()
            const selection = window.getSelection()
            if (selection) {
              const range = document.createRange()
              range.selectNodeContents(editorRef.current)
              range.collapse(false) // Move to end
              selection.removeAllRanges()
              selection.addRange(range)
            }
          }
          // Mobile: skip focus to prevent keyboard popup - user can tap to type when ready
        }
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (isComposing.current || !editorRef.current) return

    const markdown = htmlToMarkdown(editorRef.current.innerHTML)

    // Check max length - emotes count as 1 character each
    const displayLength = getDisplayLength(markdown)

    if (displayLength <= maxLength) {
      lastValueRef.current = markdown
      onChange(markdown)
    } else {
      // Revert to last valid value
      editorRef.current.innerHTML = markdownToHtml(lastValueRef.current)
    }
  }, [onChange, maxLength])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow Enter for new lines but prevent form submission
    if (e.key === 'Enter' && !e.shiftKey) {
      // Let default behavior create a new line
    }
  }, [])

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-placeholder={placeholder}
        aria-multiline="true"
        className={`min-h-[80px] outline-none whitespace-pre-wrap break-words ${className}`}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { isComposing.current = true }}
        onCompositionEnd={() => {
          isComposing.current = false
          handleInput()
        }}
        suppressContentEditableWarning
      />
      {/* Placeholder */}
      {!value && (
        <div className="absolute top-0 left-0 pointer-events-none text-neutral-500">
          {placeholder}
        </div>
      )}
    </div>
  )
}
