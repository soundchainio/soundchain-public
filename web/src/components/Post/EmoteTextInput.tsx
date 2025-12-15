import React, { useRef, useEffect, useCallback } from 'react'

interface EmoteTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
}

// Regex to match our custom emote format: ![emote:name](url)
const EMOTE_REGEX = /!\[emote:([^\]]+)\]\(([^)]+)\)/g

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

  // Convert emote markdown to img tags
  html = html.replace(EMOTE_REGEX, (_, name, url) => {
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
      if (editorRef.current.innerHTML !== html) {
        // Save selection
        const selection = window.getSelection()
        const hadFocus = document.activeElement === editorRef.current

        editorRef.current.innerHTML = html
        lastValueRef.current = value

        // Restore cursor to end if we had focus
        if (hadFocus && selection) {
          const range = document.createRange()
          range.selectNodeContents(editorRef.current)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (isComposing.current || !editorRef.current) return

    const markdown = htmlToMarkdown(editorRef.current.innerHTML)

    // Check max length (count graphemes for emojis)
    const splitter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' })
    const graphemes = [...splitter.segment(markdown)].length

    if (graphemes <= maxLength) {
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
