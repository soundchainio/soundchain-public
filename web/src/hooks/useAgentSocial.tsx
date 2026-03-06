/**
 * Agent SOCIAL — Engagement, Scheduling, Analytics
 * Auto-engagement, post scheduling, social analytics — all in-browser.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const SOCIAL_MODE = {
  ACTIVE: 'ACTIVE',
  SCHEDULING: 'SCHEDULING',
  ANALYZING: 'ANALYZING',
  IDLE: 'IDLE',
} as const
export type SocialMode = typeof SOCIAL_MODE[keyof typeof SOCIAL_MODE]

export const POST_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const
export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS]

export const ENGAGEMENT_KIND = {
  LIKE: 'LIKE',
  COMMENT: 'COMMENT',
  SHARE: 'SHARE',
  FOLLOW: 'FOLLOW',
  REPOST: 'REPOST',
  MENTION: 'MENTION',
} as const
export type EngagementKind = typeof ENGAGEMENT_KIND[keyof typeof ENGAGEMENT_KIND]

export const ANALYTICS_PERIOD = {
  HOUR: 'HOUR',
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
} as const
export type AnalyticsPeriod = typeof ANALYTICS_PERIOD[keyof typeof ANALYTICS_PERIOD]

// ─── Types ───────────────────────────────────────────────────────────

export interface ScheduledPost {
  id: string
  content: string
  mediaUrl?: string
  scheduledAt: number
  status: PostStatus
  platform: string
}

export interface EngagementMetric {
  kind: EngagementKind
  count: number
  trend: number
}

interface AgentSocialContextValue {
  mode: SocialMode
  setMode: (mode: SocialMode) => void
  scheduledPosts: ScheduledPost[]
  addScheduledPost: (post: Omit<ScheduledPost, 'id' | 'status'>) => void
  removeScheduledPost: (id: string) => void
  engagementToday: number
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentSocialContext = createContext<AgentSocialContextValue>({
  mode: SOCIAL_MODE.IDLE,
  setMode: () => {},
  scheduledPosts: [],
  addScheduledPost: () => {},
  removeScheduledPost: () => {},
  engagementToday: 0,
})

export const useAgentSocial = () => useContext(AgentSocialContext)

// ─── Provider ────────────────────────────────────────────────────────

export function AgentSocialProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SocialMode>(SOCIAL_MODE.IDLE)
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [engagementToday, setEngagementToday] = useState(0)

  const addScheduledPost = useCallback((post: Omit<ScheduledPost, 'id' | 'status'>) => {
    const newPost: ScheduledPost = {
      ...post,
      id: 'sp_' + Math.random().toString(36).slice(2, 10),
      status: POST_STATUS.SCHEDULED,
    }
    setScheduledPosts((prev) => [...prev, newPost])
  }, [])

  const removeScheduledPost = useCallback((id: string) => {
    setScheduledPosts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return (
    <AgentSocialContext.Provider
      value={{ mode, setMode, scheduledPosts, addScheduledPost, removeScheduledPost, engagementToday }}
    >
      {children}
    </AgentSocialContext.Provider>
  )
}
