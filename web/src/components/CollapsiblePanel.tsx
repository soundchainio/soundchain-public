import React, { useEffect, useRef } from 'react'
import { usePanel } from 'contexts/PanelContext'
import { PanelId } from 'contexts/reducers/panel'
import { IoClose, IoRemove, IoExpand } from 'react-icons/io5'

interface CollapsiblePanelProps {
  panelId: PanelId
  title: string
  children: React.ReactNode
  width?: string
  height?: string
  className?: string
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  panelId,
  title,
  children,
  width = 'w-full md:w-[800px]',
  height = 'h-[90vh]',
  className = '',
}) => {
  const { panel, isOpen, isMinimized, close, minimize, bringToFront } = usePanel(panelId)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Restore scroll position when panel opens/maximizes
  useEffect(() => {
    if (isOpen && scrollContainerRef.current && panel.scrollPosition) {
      scrollContainerRef.current.scrollTop = panel.scrollPosition
    }
  }, [isOpen, panel.scrollPosition])

  // Don't render if closed
  if (!isOpen && !isMinimized) {
    return null
  }

  // Don't render minimized panels (they'll appear in the taskbar)
  if (isMinimized) {
    return null
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: panel.zIndex - 1 }}
        onClick={close}
      />

      {/* Panel container */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${width} ${height} ${className}`}
        style={{ zIndex: panel.zIndex }}
        onClick={bringToFront}
      >
        <div className="flex h-full flex-col rounded-lg bg-gray-10 shadow-2xl border border-gray-30">
          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-gray-30 bg-gray-20 px-4 py-3 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-90">{title}</h2>

            <div className="flex items-center gap-2">
              {/* Minimize button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // Save scroll position before minimizing
                  if (scrollContainerRef.current) {
                    const scrollPosition = scrollContainerRef.current.scrollTop
                    // TODO: Dispatch action to save scroll position
                  }
                  minimize()
                }}
                className="rounded p-1.5 text-gray-70 transition hover:bg-gray-30 hover:text-gray-90"
                title="Minimize"
              >
                <IoRemove size={20} />
              </button>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  close()
                }}
                className="rounded p-1.5 text-gray-70 transition hover:bg-red-500 hover:text-white"
                title="Close"
              >
                <IoClose size={20} />
              </button>
            </div>
          </div>

          {/* Panel content */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
