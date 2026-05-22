/**
 * Phase 7e — Vercel-direct replacement for `useChatsQuery` + `useChatsLazyQuery`
 * + `useChatHistoryLazyQuery`.
 *
 * Endpoints:
 *   GET /api/pulse/chats              — inbox list (one row per conversation partner)
 *   GET /api/pulse/history?profileId= — chat history with a specific user
 *
 * Returns Apollo contracts:
 *   useChats → data.chats.nodes[]
 *   useChatHistory → data.chatHistory.nodes[]
 *
 * Auth via cookie (handler does the JWT lookup).
 */
import { useEffect, useState } from 'react'

type ChatNode = {
  id: string
  body?: string | null
  createdAt: string
  isMine: boolean
  fromId?: string
  toId?: string
  unreadCount?: number
  profile: {
    id: string
    displayName: string
    userHandle: string
    profilePicture: string | null
    verified?: boolean
  } | null
}

type ChatsShape = {
  chats: {
    nodes: ChatNode[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

type ChatHistoryShape = {
  chatHistory: {
    nodes: ChatNode[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null; totalCount: number }
  }
}

const fetchChats = async (): Promise<ChatNode[] | null> => {
  try {
    const r = await fetch('/api/pulse/chats', { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return Array.isArray(json?.chats) ? json.chats : Array.isArray(json?.nodes) ? json.nodes : []
  } catch {
    return null
  }
}

const fetchHistory = async (profileId: string, limit: number): Promise<ChatNode[] | null> => {
  if (!profileId) return null
  try {
    const r = await fetch(`/api/pulse/history?profileId=${encodeURIComponent(profileId)}&limit=${limit}`, { credentials: 'include' })
    if (!r.ok) return null
    const json = await r.json()
    return Array.isArray(json?.messages) ? json.messages : Array.isArray(json?.nodes) ? json.nodes : []
  } catch {
    return null
  }
}

// --- useChats (eager) ---
export const useChats = (opts?: {
  pollInterval?: number
  skip?: boolean
  fetchPolicy?: string
}): {
  data: ChatsShape | undefined
  loading: boolean
  error: Error | null
  fetchMore: () => Promise<void>
  refetch: () => Promise<void>
} => {
  const skip = !!opts?.skip
  const pollInterval = opts?.pollInterval || 0
  const [nodes, setNodes] = useState<ChatNode[]>([])
  const [loading, setLoading] = useState<boolean>(!skip)
  const [error, setError] = useState<Error | null>(null)
  const [bust, setBust] = useState(0)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    const run = () => {
      fetchChats().then((res) => {
        if (cancelled) return
        if (!res) { setError(new Error('chats load failed')); setLoading(false); return }
        setNodes(res)
        setError(null)
        setLoading(false)
      })
    }
    setLoading(true)
    run()
    let timer: any = null
    if (pollInterval > 0) {
      timer = setInterval(run, pollInterval)
    }
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [skip, bust, pollInterval])
  const data: ChatsShape | undefined = nodes.length > 0 || !loading ? {
    chats: {
      nodes,
      pageInfo: { hasNextPage: false, endCursor: null, totalCount: nodes.length },
    },
  } : undefined
  const fetchMore = async () => {}  // single-page endpoint
  const refetch = async () => { setBust((b) => b + 1) }
  return { data, loading, error, fetchMore, refetch }
}

// --- useChatsLazy ---
type LazyChatsResult = { data: ChatsShape | undefined; loading: boolean; called: boolean }
type LazyChatsTrigger = (opts?: { variables?: { page?: { first?: number } } }) => Promise<void>

export const useChatsLazy = (_opts?: { fetchPolicy?: string }): [LazyChatsTrigger, LazyChatsResult] => {
  const [data, setData] = useState<ChatsShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const trigger: LazyChatsTrigger = async () => {
    setLoading(true)
    setCalled(true)
    const nodes = await fetchChats()
    if (nodes) setData({ chats: { nodes, pageInfo: { hasNextPage: false, endCursor: null, totalCount: nodes.length } } })
    setLoading(false)
  }
  return [trigger, { data, loading, called }]
}

// --- useChatHistoryLazy ---
type LazyHistoryResult = { data: ChatHistoryShape | undefined; loading: boolean; called: boolean; refetch: () => Promise<void> }
type LazyHistoryTrigger = (opts?: { variables?: { profileId?: string; page?: { first?: number } } }) => Promise<void>

// Single message by id (Apollo useMessageQuery)
type MessageShape = { message: any | null }

export const useMessage = (opts: {
  variables?: { id?: string }
  skip?: boolean
}): {
  data: MessageShape | undefined
  loading: boolean
  error: Error | null
} => {
  const id = opts?.variables?.id || ''
  const skip = !!opts?.skip || !id
  const [data, setData] = useState<MessageShape | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(!skip)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/dm/message?id=${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled) return
        setData({ message: json?.message ?? null })
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, skip])
  return { data, loading, error: null }
}

export const useChatHistoryLazy = (_opts?: { fetchPolicy?: string }): [LazyHistoryTrigger, LazyHistoryResult] => {
  const [data, setData] = useState<ChatHistoryShape | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [called, setCalled] = useState(false)
  const [lastProfileId, setLastProfileId] = useState<string>('')
  const trigger: LazyHistoryTrigger = async (opts) => {
    const profileId = opts?.variables?.profileId || ''
    const first = opts?.variables?.page?.first ?? 50
    if (!profileId) return
    setLoading(true)
    setCalled(true)
    setLastProfileId(profileId)
    const nodes = await fetchHistory(profileId, first)
    if (nodes) setData({ chatHistory: { nodes, pageInfo: { hasNextPage: false, endCursor: null, totalCount: nodes.length } } })
    setLoading(false)
  }
  const refetch = async () => {
    if (!lastProfileId) return
    setLoading(true)
    const nodes = await fetchHistory(lastProfileId, 50)
    if (nodes) setData({ chatHistory: { nodes, pageInfo: { hasNextPage: false, endCursor: null, totalCount: nodes.length } } })
    setLoading(false)
  }
  return [trigger, { data, loading, called, refetch }]
}
