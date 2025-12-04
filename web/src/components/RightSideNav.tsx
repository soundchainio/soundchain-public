import React from 'react'
import { usePanelDispatch } from 'contexts/PanelContext'
import { PanelId } from 'contexts/reducers/panel'
import {
  IoStorefront,
  IoHome,
  IoGrid,
  IoPerson,
  IoWallet,
  IoSettings,
  IoNotifications,
  IoMail,
  IoAdd,
  IoCompass,
  IoAlbums,
  IoStatsChart,
} from 'react-icons/io5'

interface NavItem {
  id: PanelId
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'marketplace', icon: IoStorefront, label: 'Marketplace' },
  { id: 'feed', icon: IoHome, label: 'Feed' },
  { id: 'dashboard', icon: IoGrid, label: 'Dashboard' },
  { id: 'discover', icon: IoCompass, label: 'Discover' },
  { id: 'collections', icon: IoAlbums, label: 'Collections' },
  { id: 'create', icon: IoAdd, label: 'Create' },
  { id: 'profile', icon: IoPerson, label: 'Profile' },
  { id: 'wallet', icon: IoWallet, label: 'Wallet' },
  { id: 'notifications', icon: IoNotifications, label: 'Notifications' },
  { id: 'messages', icon: IoMail, label: 'Messages' },
  { id: 'analytics', icon: IoStatsChart, label: 'Analytics' },
  { id: 'settings', icon: IoSettings, label: 'Settings' },
]

export const RightSideNav: React.FC = () => {
  const { togglePanel } = usePanelDispatch()

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 flex flex-col items-center gap-2 bg-gray-10 border-l border-gray-30 p-2 shadow-xl md:hidden">
      {/* Right-side icon navigation for mobile thumb access */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => togglePanel(item.id)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl bg-gray-20 text-gray-70 transition hover:rounded-lg hover:bg-gradient-to-r hover:from-[#ab4eff] hover:to-[#84ff82] hover:text-white"
            title={item.label}
          >
            <Icon size={24} />

            {/* Tooltip label */}
            <span className="absolute right-full mr-2 hidden whitespace-nowrap rounded bg-gray-90 px-2 py-1 text-xs text-white group-hover:block">
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
