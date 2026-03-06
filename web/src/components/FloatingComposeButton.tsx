import { useModalDispatch } from 'contexts/ModalContext'

/**
 * Floating Action Button (FAB) for creating posts
 * Blade Runner 2049 inspired - cyberpunk aesthetic
 * Opens compose modal for ALL users (guests can post too!)
 */
export const FloatingComposeButton = () => {
  const { dispatchShowCreateModal } = useModalDispatch()

  const handleClick = () => {
    // Open compose modal for everyone - guests can post too
    dispatchShowCreateModal(true, 'post')
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-xl bg-black/80 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:border-cyan-400 hover:scale-105 active:scale-95 transition-all duration-200 backdrop-blur-sm group"
      aria-label="Create post"
    >
      {/* Cyberpunk Plus Icon - Blade Runner style */}
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {/* Horizontal line with glow */}
        <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
        {/* Vertical line */}
        <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
        {/* Corner accents - cyberpunk style */}
        <path d="M5 5 L7 5 L7 7" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
        <path d="M19 5 L17 5 L17 7" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
        <path d="M5 19 L7 19 L7 17" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
        <path d="M19 19 L17 19 L17 17" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
      </svg>
      {/* Subtle glow ring */}
      <div className="absolute inset-0 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors" />
    </button>
  )
}

export default FloatingComposeButton
