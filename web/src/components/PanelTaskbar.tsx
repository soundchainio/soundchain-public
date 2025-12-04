import React from 'react'
import { usePanelState, usePanelDispatch } from 'contexts/PanelContext'
import { PanelId } from 'contexts/reducers/panel'
import { IoExpand } from 'react-icons/io5'

const PANEL_LABELS: Record<PanelId, string> = {
  marketplace: 'Marketplace',
  feed: 'Feed',
  dashboard: 'Dashboard',
  profile: 'Profile',
  wallet: 'Wallet',
  settings: 'Settings',
  notifications: 'Notifications',
  messages: 'Messages',
  create: 'Create',
  discover: 'Discover',
  collections: 'Collections',
  analytics: 'Analytics',
}

export const PanelTaskbar: React.FC = () => {
  const { minimizedPanels, panels } = usePanelState()
  const { maximizePanel } = usePanelDispatch()

  // Don't render if no minimized panels
  if (minimizedPanels.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 border-t border-gray-30 bg-gray-10 px-4 py-2">
      {minimizedPanels.map((panelId) => (
        <button
          key={panelId}
          onClick={() => maximizePanel(panelId)}
          className="flex items-center gap-2 rounded bg-gray-20 px-4 py-2 text-sm font-medium text-gray-90 transition hover:bg-gray-30"
          title={`Restore ${PANEL_LABELS[panelId]}`}
        >
          <span>{PANEL_LABELS[panelId]}</span>
          <IoExpand size={14} />
        </button>
      ))}
    </div>
  )
}
