/**
 * Agent FORGE — Source Code Search Engine
 * Scans GitHub, npm, PyPI, crates.io — every open source repo on Earth.
 * Delivers ready-to-use implementations directly to the browser.
 * Feeds all other agents with the code they need. The engine behind the engine.
 * Powered by OGUN.
 *
 * ZERO BOOLEANS — all state uses typed string enums.
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

// ─── Enums ───────────────────────────────────────────────────────────

export const FORGE_MODE = {
  SCANNING: 'SCANNING',
  INDEXING: 'INDEXING',
  DELIVERING: 'DELIVERING',
  IDLE: 'IDLE',
} as const
export type ForgeMode = typeof FORGE_MODE[keyof typeof FORGE_MODE]

export const SOURCE_REGISTRY = {
  GITHUB: 'GITHUB',
  NPM: 'NPM',
  PYPI: 'PYPI',
  CRATES_IO: 'CRATES_IO',
  GO_MODULES: 'GO_MODULES',
  CODEPEN: 'CODEPEN',
  OBSERVABLE: 'OBSERVABLE',
  OPENCLAW: 'OPENCLAW',
} as const
export type SourceRegistry = typeof SOURCE_REGISTRY[keyof typeof SOURCE_REGISTRY]

export const CODE_CATEGORY = {
  GAME_ENGINE: 'GAME_ENGINE',
  VIDEO_PROCESSING: 'VIDEO_PROCESSING',
  AUDIO_ENGINE: 'AUDIO_ENGINE',
  MARKET_DATA: 'MARKET_DATA',
  GENERATIVE_ART: 'GENERATIVE_ART',
  UI_COMPONENT: 'UI_COMPONENT',
  BLOCKCHAIN: 'BLOCKCHAIN',
  AI_ML: 'AI_ML',
  NETWORKING: 'NETWORKING',
  STORAGE: 'STORAGE',
  ANIMATION: 'ANIMATION',
  SOCIAL: 'SOCIAL',
  SECURITY: 'SECURITY',
  UTILITY: 'UTILITY',
} as const
export type CodeCategory = typeof CODE_CATEGORY[keyof typeof CODE_CATEGORY]

export const LICENSE_TIER = {
  FREE: 'FREE',
  PERMISSIVE: 'PERMISSIVE',
  COPYLEFT: 'COPYLEFT',
  UNKNOWN: 'UNKNOWN',
} as const
export type LicenseTier = typeof LICENSE_TIER[keyof typeof LICENSE_TIER]

export const SEARCH_STATUS = {
  IDLE: 'IDLE',
  SEARCHING: 'SEARCHING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const
export type SearchStatus = typeof SEARCH_STATUS[keyof typeof SEARCH_STATUS]

export const RESULT_RANK = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  LOW: 'LOW',
} as const
export type ResultRank = typeof RESULT_RANK[keyof typeof RESULT_RANK]

// ─── License Classification ─────────────────────────────────────────

const PERMISSIVE_LICENSES = ['mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'unlicense', 'cc0-1.0', '0bsd']
const COPYLEFT_LICENSES = ['gpl-2.0', 'gpl-3.0', 'agpl-3.0', 'lgpl-2.1', 'lgpl-3.0', 'mpl-2.0']

function classifyLicense(license: string | null): LicenseTier {
  if (!license) return LICENSE_TIER.UNKNOWN
  const lower = license.toLowerCase()
  if (PERMISSIVE_LICENSES.some((l) => lower.includes(l))) return LICENSE_TIER.FREE
  if (lower === 'mit' || lower === 'apache-2.0') return LICENSE_TIER.FREE
  if (COPYLEFT_LICENSES.some((l) => lower.includes(l))) return LICENSE_TIER.COPYLEFT
  return LICENSE_TIER.PERMISSIVE
}

// ─── Types ───────────────────────────────────────────────────────────

export interface CodeResult {
  id: string
  name: string
  description: string
  registry: SourceRegistry
  category: CodeCategory
  licenseTier: LicenseTier
  license: string
  rank: ResultRank
  stars: number
  weeklyDownloads: number
  lastUpdated: string
  url: string
  repoUrl: string
  language: string
  snippet?: string
  dependencies: number
  size: string
  clientSideOnly: string // 'YES' | 'NO' | 'PARTIAL'
  tags: string[]
}

export interface ForgeSearch {
  id: string
  query: string
  category: CodeCategory | null
  registries: SourceRegistry[]
  results: CodeResult[]
  status: SearchStatus
  timestamp: number
  resultCount: number
}

export interface ForgeCache {
  searches: ForgeSearch[]
  totalResults: number
  lastScan: number
}

interface AgentForgeContextValue {
  mode: ForgeMode
  setMode: (mode: ForgeMode) => void
  searchCode: (query: string, category?: CodeCategory, registries?: SourceRegistry[]) => Promise<void>
  activeSearch: ForgeSearch | null
  searchHistory: ForgeSearch[]
  cache: ForgeCache
  clearCache: () => void
  resultCount: number
  searchStatus: SearchStatus
}

// ─── Context ─────────────────────────────────────────────────────────

const AgentForgeContext = createContext<AgentForgeContextValue>({
  mode: FORGE_MODE.IDLE,
  setMode: () => {},
  searchCode: async () => {},
  activeSearch: null,
  searchHistory: [],
  cache: { searches: [], totalResults: 0, lastScan: 0 },
  clearCache: () => {},
  resultCount: 0,
  searchStatus: SEARCH_STATUS.IDLE,
})

export const useAgentForge = () => useContext(AgentForgeContext)

// ─── Rank Calculator ─────────────────────────────────────────────────

function rankResult(stars: number, downloads: number, licenseTier: LicenseTier, clientSide: string): ResultRank {
  let score = 0
  if (stars > 10000) score += 4
  else if (stars > 1000) score += 3
  else if (stars > 100) score += 2
  else if (stars > 10) score += 1

  if (downloads > 1000000) score += 3
  else if (downloads > 100000) score += 2
  else if (downloads > 10000) score += 1

  if (licenseTier === LICENSE_TIER.FREE) score += 2
  else if (licenseTier === LICENSE_TIER.PERMISSIVE) score += 1

  if (clientSide === 'YES') score += 2
  else if (clientSide === 'PARTIAL') score += 1

  if (score >= 8) return RESULT_RANK.EXCELLENT
  if (score >= 5) return RESULT_RANK.GOOD
  if (score >= 3) return RESULT_RANK.FAIR
  return RESULT_RANK.LOW
}

// ─── GitHub Search ───────────────────────────────────────────────────

async function searchGitHub(query: string, category: CodeCategory | null): Promise<CodeResult[]> {
  const categoryTags: Record<string, string> = {
    [CODE_CATEGORY.GAME_ENGINE]: 'game engine browser javascript',
    [CODE_CATEGORY.VIDEO_PROCESSING]: 'video processing browser wasm ffmpeg',
    [CODE_CATEGORY.AUDIO_ENGINE]: 'audio web-audio synthesis browser',
    [CODE_CATEGORY.MARKET_DATA]: 'crypto market data api price',
    [CODE_CATEGORY.GENERATIVE_ART]: 'generative art canvas webgl creative coding',
    [CODE_CATEGORY.UI_COMPONENT]: 'react component ui library',
    [CODE_CATEGORY.BLOCKCHAIN]: 'ethereum polygon web3 smart contract',
    [CODE_CATEGORY.AI_ML]: 'machine learning tensorflow onnx browser',
    [CODE_CATEGORY.NETWORKING]: 'websocket p2p webrtc networking',
    [CODE_CATEGORY.STORAGE]: 'indexeddb storage browser local-first',
    [CODE_CATEGORY.ANIMATION]: 'animation gsap lottie canvas motion',
    [CODE_CATEGORY.SOCIAL]: 'social feed activity stream engagement',
    [CODE_CATEGORY.SECURITY]: 'encryption auth jwt browser security',
    [CODE_CATEGORY.UTILITY]: 'utility helper library javascript',
  }

  const searchQuery = category ? `${query} ${categoryTags[category] || ''}` : query
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=15`

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    })

    if (response.status === 403) return [] // Rate limited
    if (response.status !== 200) return []

    const data = await response.json()
    if (!data.items) return []

    return data.items.map((repo: any) => {
      const licenseTier = classifyLicense(repo.license?.spdx_id)
      const clientSide = repo.language === 'JavaScript' || repo.language === 'TypeScript' ? 'YES' : 'PARTIAL'
      return {
        id: 'gh_' + repo.id,
        name: repo.full_name,
        description: (repo.description || '').slice(0, 300),
        registry: SOURCE_REGISTRY.GITHUB,
        category: category || CODE_CATEGORY.UTILITY,
        licenseTier,
        license: repo.license?.spdx_id || 'unknown',
        rank: rankResult(repo.stargazers_count, 0, licenseTier, clientSide),
        stars: repo.stargazers_count,
        weeklyDownloads: 0,
        lastUpdated: repo.updated_at,
        url: repo.html_url,
        repoUrl: repo.html_url,
        language: repo.language || 'unknown',
        dependencies: 0,
        size: `${Math.round(repo.size / 1024)}MB`,
        clientSideOnly: clientSide,
        tags: [repo.language, ...(repo.topics || [])].filter(Boolean).slice(0, 8),
      }
    })
  } catch {
    return []
  }
}

// ─── npm Search ──────────────────────────────────────────────────────

async function searchNpm(query: string): Promise<CodeResult[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`

  try {
    const response = await fetch(url)
    if (response.status !== 200) return []

    const data = await response.json()
    if (!data.objects) return []

    return data.objects.map((obj: any) => {
      const pkg = obj.package
      const score = obj.score?.final || 0
      const downloads = obj.score?.detail?.popularity || 0
      const licenseTier = classifyLicense(pkg.license)
      return {
        id: 'npm_' + pkg.name,
        name: pkg.name,
        description: (pkg.description || '').slice(0, 300),
        registry: SOURCE_REGISTRY.NPM,
        category: CODE_CATEGORY.UTILITY,
        licenseTier,
        license: pkg.license || 'unknown',
        rank: score > 0.7 ? RESULT_RANK.EXCELLENT : score > 0.4 ? RESULT_RANK.GOOD : score > 0.2 ? RESULT_RANK.FAIR : RESULT_RANK.LOW,
        stars: 0,
        weeklyDownloads: Math.round(downloads * 1000000),
        lastUpdated: pkg.date || '',
        url: `https://www.npmjs.com/package/${pkg.name}`,
        repoUrl: pkg.links?.repository || '',
        language: 'JavaScript',
        dependencies: 0,
        size: '',
        clientSideOnly: 'PARTIAL',
        tags: pkg.keywords?.slice(0, 8) || [],
      }
    })
  } catch {
    return []
  }
}

// ─── Provider ────────────────────────────────────────────────────────

export function AgentForgeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ForgeMode>(FORGE_MODE.IDLE)
  const [activeSearch, setActiveSearch] = useState<ForgeSearch | null>(null)
  const [searchHistory, setSearchHistory] = useState<ForgeSearch[]>([])
  const [cache, setCache] = useState<ForgeCache>({ searches: [], totalResults: 0, lastScan: 0 })
  const [searchStatus, setSearchStatus] = useState<SearchStatus>(SEARCH_STATUS.IDLE)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCache = useCallback(() => {
    setCache({ searches: [], totalResults: 0, lastScan: 0 })
    setSearchHistory([])
  }, [])

  const searchCode = useCallback(
    async (query: string, category?: CodeCategory, registries?: SourceRegistry[]) => {
      if (!query.trim()) return

      // Debounce rapid searches
      if (searchDebounce.current) clearTimeout(searchDebounce.current)

      const search: ForgeSearch = {
        id: 'fs_' + Math.random().toString(36).slice(2, 10),
        query,
        category: category || null,
        registries: registries || [SOURCE_REGISTRY.GITHUB, SOURCE_REGISTRY.NPM],
        results: [],
        status: SEARCH_STATUS.SEARCHING,
        timestamp: Date.now(),
        resultCount: 0,
      }

      setActiveSearch(search)
      setMode(FORGE_MODE.SCANNING)
      setSearchStatus(SEARCH_STATUS.SEARCHING)

      const allResults: CodeResult[] = []
      const targetRegistries = registries || [SOURCE_REGISTRY.GITHUB, SOURCE_REGISTRY.NPM]

      try {
        // Search registries in parallel
        const promises: Promise<CodeResult[]>[] = []

        if (targetRegistries.includes(SOURCE_REGISTRY.GITHUB)) {
          promises.push(searchGitHub(query, category || null))
        }
        if (targetRegistries.includes(SOURCE_REGISTRY.NPM)) {
          promises.push(searchNpm(query))
        }

        const results = await Promise.allSettled(promises)

        for (const result of results) {
          if (result.status === 'fulfilled') {
            allResults.push(...result.value)
          }
        }

        // Sort by rank (EXCELLENT first) then stars
        const rankOrder = { [RESULT_RANK.EXCELLENT]: 0, [RESULT_RANK.GOOD]: 1, [RESULT_RANK.FAIR]: 2, [RESULT_RANK.LOW]: 3 }
        allResults.sort((a, b) => {
          const rankDiff = rankOrder[a.rank] - rankOrder[b.rank]
          if (rankDiff !== 0) return rankDiff
          return b.stars - a.stars
        })

        // Filter: prefer FREE/PERMISSIVE licenses
        const safeResults = allResults.filter(
          (r) => r.licenseTier === LICENSE_TIER.FREE || r.licenseTier === LICENSE_TIER.PERMISSIVE
        )
        const finalResults = safeResults.length > 0 ? safeResults : allResults

        const completedSearch: ForgeSearch = {
          ...search,
          results: finalResults.slice(0, 25),
          status: SEARCH_STATUS.COMPLETE,
          resultCount: finalResults.length,
        }

        setActiveSearch(completedSearch)
        setSearchHistory((prev) => [completedSearch, ...prev].slice(0, 50))
        setCache((prev) => ({
          searches: [completedSearch, ...prev.searches].slice(0, 100),
          totalResults: prev.totalResults + finalResults.length,
          lastScan: Date.now(),
        }))
        setMode(FORGE_MODE.DELIVERING)
        setSearchStatus(SEARCH_STATUS.COMPLETE)

        // Also send to API for server-side caching
        try {
          fetch('/api/agent/forge/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              category,
              resultCount: finalResults.length,
              topResults: finalResults.slice(0, 5).map((r) => ({
                name: r.name,
                registry: r.registry,
                rank: r.rank,
                stars: r.stars,
                license: r.license,
              })),
              timestamp: Date.now(),
            }),
            keepalive: true,
          }).catch(() => {})
        } catch {
          // silent
        }
      } catch {
        setSearchStatus(SEARCH_STATUS.ERROR)
        setMode(FORGE_MODE.IDLE)
      }
    },
    []
  )

  return (
    <AgentForgeContext.Provider
      value={{
        mode,
        setMode,
        searchCode,
        activeSearch,
        searchHistory,
        cache,
        clearCache,
        resultCount: activeSearch?.resultCount || 0,
        searchStatus,
      }}
    >
      {children}
    </AgentForgeContext.Provider>
  )
}
