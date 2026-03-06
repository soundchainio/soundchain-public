import React from 'react'
import { Music, Heart, Activity, Grid3X3, Clock, Bookmark, ShoppingBag } from 'lucide-react'

export type ProfileTabType = 'collected' | 'created' | 'favorited' | 'activity' | 'listings' | 'offers' | 'hidden'

interface ProfileTabsProps {
  activeTab: ProfileTabType
  onTabChange: (tab: ProfileTabType) => void
  counts?: {
    collected?: number
    created?: number
    favorited?: number
    activity?: number
    listings?: number
    offers?: number
  }
  isOwnProfile?: boolean
}

const tabs: Array<{ id: ProfileTabType; label: string; icon: React.ElementType; ownProfileOnly?: boolean }> = [
  { id: 'collected', label: 'Collected', icon: Grid3X3 },
  { id: 'created', label: 'Created', icon: Music },
  { id: 'favorited', label: 'Favorited', icon: Heart },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'listings', label: 'Listings', icon: ShoppingBag, ownProfileOnly: true },
  { id: 'offers', label: 'Offers', icon: Clock, ownProfileOnly: true },
]

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  counts = {},
  isOwnProfile = false,
}) => {
  const visibleTabs = tabs.filter(tab => !tab.ownProfileOnly || isOwnProfile)

  return (
    <div className="bg-black/95 border-b border-white/5 sticky top-16 z-20">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const count = counts[tab.id as keyof typeof counts]
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'text-white border-cyan-400'
                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-white/5 text-gray-500'
                  }`}>
                    {count > 999 ? '999+' : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProfileTabs
