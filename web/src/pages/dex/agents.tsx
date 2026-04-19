/**
 * SoundChain Agent Templates — Public Marketplace
 * /dex/agents
 *
 * The 12 production agents running on Anthropic Managed Agents API.
 * Each card is a ready-to-deploy template. Click "Try Now" to pre-run
 * `jack managed <handle>` with a starter prompt in the FURL terminal.
 *
 * This is SoundChain's answer to Pinata Agent Templates, Alchemy,
 * ampersend, Tempo — but music-domain, on Anthropic's canonical runtime,
 * with Agent Academy learning loop.
 */

import { useState, ReactElement } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Zap, Brain, Music, Wallet, Upload, Rss, MessageCircle, Book, ListMusic, Users, Coins, Cpu, CheckCircle2, Rocket } from 'lucide-react'
import type { CustomLayout } from '../_app'

const MiniSphere = dynamic(() => import('components/MiniSphere').then(m => m.MiniSphere), { ssr: false })

// Agent catalog — keep in sync with web/src/lib/managed-agents/agents.ts
// We duplicate here (vs importing) so this page works even if managed-agents module fails
interface AgentCard {
  handle: string
  name: string
  tier: 'SONNET' | 'HAIKU'
  model: string
  role: 'Orchestrator' | 'Feature' | 'Utility' | 'Social'
  tagline: string
  description: string
  icon: any
  color: string // tailwind gradient
  tools: number
  starterPrompt: string
  example: string
}

const AGENTS: AgentCard[] = [
  {
    handle: 'smith',
    name: 'SMITH',
    tier: 'SONNET',
    model: 'Sonnet 4.6',
    role: 'Orchestrator',
    tagline: 'The Code Agent',
    description: 'Full platform access. Queries MongoDB, reads Polygon contracts, checks IPFS, searches GitHub/npm, posts to feed. Full bash + file I/O.',
    icon: Cpu,
    color: 'from-cyan-500 to-blue-600',
    tools: 14,
    starterPrompt: 'How many users are on SoundChain right now?',
    example: 'Audit the smart contract suite for re-entrancy bugs',
  },
  {
    handle: 'furl',
    name: 'FURL',
    tier: 'SONNET',
    model: 'Sonnet 4.6',
    role: 'Orchestrator',
    tagline: 'The Universal AI',
    description: 'THE ONE — SoundChain\'s flagship agent. Knows every track, agent, artist, and feature. Answers like a genius friend, not a chatbot.',
    icon: Brain,
    color: 'from-purple-500 to-pink-600',
    tools: 12,
    starterPrompt: 'What makes SoundChain different from Spotify?',
    example: 'Find trending Web3 music news from this week and relate it to SoundChain',
  },
  {
    handle: 'soundchainradio',
    name: 'SoundChainRadio',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Feature',
    tagline: 'Auto DJ',
    description: '24/7 broadcasting agent. Knows every track in the 8,800+ catalog. Auto-posts hourly Now Playing updates to the feed.',
    icon: Music,
    color: 'from-amber-500 to-orange-600',
    tools: 4,
    starterPrompt: 'What is playing on OGUN Radio right now?',
    example: 'Give me the top 5 most-streamed tracks this week',
  },
  {
    handle: 'agent_explore',
    name: 'Explore',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Feature',
    tagline: 'Discovery Engine',
    description: 'Music discovery specialist. Surfaces hidden gems, explains why tracks are rising, recommends based on listening patterns.',
    icon: Rocket,
    color: 'from-indigo-500 to-purple-600',
    tools: 3,
    starterPrompt: 'Find me an underrated lo-fi track worth streaming',
    example: 'What is the most-saved track under 100 plays?',
  },
  {
    handle: 'agent_wallet',
    name: 'Wallet',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Utility',
    tagline: 'OGUN Specialist',
    description: 'On-chain wallet detective. Reads OGUN balances, staking positions, claimable rewards. Read-only — cannot move funds.',
    icon: Wallet,
    color: 'from-green-500 to-emerald-600',
    tools: 3,
    starterPrompt: 'What is the total OGUN supply?',
    example: 'How much OGUN is currently staked across all users?',
  },
  {
    handle: 'agent_upload',
    name: 'Upload',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Feature',
    tagline: 'IPFS + SCid Inspector',
    description: 'Content integrity agent. Verifies Pinata pin status, resolves CIDs, audits broken IPFS links across the catalog.',
    icon: Upload,
    color: 'from-teal-500 to-cyan-600',
    tools: 3,
    starterPrompt: 'How many tracks have broken IPFS links?',
    example: 'Verify SCid SC-POL-1771-2600058 is pinned and accessible',
  },
  {
    handle: 'agent_feed',
    name: 'Feed',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Social',
    tagline: 'Social Curator',
    description: 'Social media manager. Knows what\'s trending, auto-posts updates, reads engagement analytics.',
    icon: Rss,
    color: 'from-pink-500 to-rose-600',
    tools: 4,
    starterPrompt: 'What is the most-liked post from the last 24 hours?',
    example: 'Draft a post about our latest feature launch',
  },
  {
    handle: 'agent_pulse',
    name: 'Pulse',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Social',
    tagline: 'DM Manager',
    description: 'Inbox specialist. Reads DMs, summarizes threads, drafts replies. Read-only — never auto-sends without approval.',
    icon: MessageCircle,
    color: 'from-blue-500 to-indigo-600',
    tools: 3,
    starterPrompt: 'Summarize my last 5 DM conversations',
    example: 'Who sent me the most messages this week?',
  },
  {
    handle: 'agent_moltbook',
    name: 'Moltbook',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Social',
    tagline: 'Cross-Platform Distribution',
    description: 'Multi-platform poster. Crafts content for SoundChain + Moltbook (+ future X, LinkedIn). Has web_fetch for external research.',
    icon: Book,
    color: 'from-violet-500 to-purple-600',
    tools: 4,
    starterPrompt: 'What is the engagement on our latest Moltbook post?',
    example: 'Cross-post today\'s feature launch to Moltbook',
  },
  {
    handle: 'agent_playlists',
    name: 'Playlists',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Feature',
    tagline: 'Auto-Curator',
    description: 'Playlist DJ. Builds themed playlists from the catalog based on mood, genre, BPM, era. Knows what pairs with what.',
    icon: ListMusic,
    color: 'from-fuchsia-500 to-pink-600',
    tools: 3,
    starterPrompt: 'Build me a 10-track focus playlist',
    example: 'What tracks would fit a late-night lo-fi vibe?',
  },
  {
    handle: 'sc_artists',
    name: 'Artists',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Social',
    tagline: 'Creator Community',
    description: 'Creator advocate. Knows every artist on SoundChain, their stats, their recent uploads, their fanbase dynamics.',
    icon: Users,
    color: 'from-rose-500 to-red-600',
    tools: 4,
    starterPrompt: 'Who are the top 5 rising artists this week?',
    example: 'Find artists with under 100 followers but high engagement',
  },
  {
    handle: 'sc_staking',
    name: 'Staking',
    tier: 'HAIKU',
    model: 'Haiku 4.5',
    role: 'Utility',
    tagline: 'Rewards Specialist',
    description: 'Staking guru. Reads current APR, total staked, claimable rewards, reward distribution math.',
    icon: Coins,
    color: 'from-yellow-500 to-amber-600',
    tools: 3,
    starterPrompt: 'What is the current staking APR?',
    example: 'How much would 1000 OGUN earn at current rates over 30 days?',
  },
]

const ROLE_FILTERS: Array<'ALL' | 'Orchestrator' | 'Feature' | 'Utility' | 'Social'> = [
  'ALL',
  'Orchestrator',
  'Feature',
  'Utility',
  'Social',
]

export default function AgentsPage() {
  const [filter, setFilter] = useState<string>('ALL')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? AGENTS : AGENTS.filter(a => a.role === filter)

  const handleTryNow = async (agent: AgentCard) => {
    // Copy the exact FURL commands to clipboard so user can paste into terminal
    const commands = `jack managed ${agent.handle}\n${agent.starterPrompt}`
    try {
      await navigator.clipboard.writeText(commands)
      setCopied(agent.handle)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // Fallback if clipboard blocked
      window.prompt('Copy these commands into the FURL terminal:', commands)
    }
  }

  return (
    <>
      <Head>
        <title>SoundChain Agent Templates — 12 Production Agents on Anthropic Managed Runtime</title>
        <meta
          name="description"
          content="12 ready-to-deploy AI agents powering SoundChain. Built on Anthropic Managed Agents API alongside Notion, Rakuten, Asana, Sentry. Music-domain specialists with 14 tools."
        />
      </Head>

      <div className="min-h-screen bg-black text-white pb-20">
        {/* Header */}
        <div className="border-b border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Link href="/dex/nodes" className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 text-sm mb-6 transition">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Link>

            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <MiniSphere size={56} />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  Agent Templates
                </h1>
                <p className="text-gray-400 text-lg">
                  12 production AI agents running on <span className="text-cyan-400 font-semibold">Anthropic Managed Agents API</span>
                </p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-cyan-400">12</div>
                <div className="text-xs text-gray-500">Agents</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">14</div>
                <div className="text-xs text-gray-500">Tools</div>
              </div>
              <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-pink-400">2</div>
                <div className="text-xs text-gray-500">Model Tiers</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">LIVE</div>
                <div className="text-xs text-gray-500">Status</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-400">BYOK</div>
                <div className="text-xs text-gray-500">Billing</div>
              </div>
            </div>

            {/* Launch alongside banner */}
            <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <span className="font-semibold text-white">Early adopter of Anthropic Managed Agents</span> — live alongside{' '}
                  <span className="text-cyan-400">Notion</span>,{' '}
                  <span className="text-cyan-400">Rakuten</span>,{' '}
                  <span className="text-cyan-400">Asana</span>,{' '}
                  <span className="text-cyan-400">Sentry</span>, and{' '}
                  <span className="text-cyan-400">Vibecode</span>. Music-domain vertical with custom on-chain + IPFS tools.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {ROLE_FILTERS.map((role) => (
              <button
                key={role}
                onClick={() => setFilter(role)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition ${
                  filter === role
                    ? 'bg-cyan-500 text-black'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                }`}
              >
                {role === 'ALL' ? 'All Agents' : role}
              </button>
            ))}
          </div>
        </div>

        {/* Agent cards grid */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((agent) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.handle}
                  className="bg-gradient-to-br from-gray-900/80 to-black border border-gray-800 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all group"
                >
                  {/* Card header with gradient */}
                  <div className={`bg-gradient-to-r ${agent.color} p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{agent.name}</div>
                          <div className="text-[10px] text-white/70 font-mono">@{agent.handle}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          agent.tier === 'SONNET'
                            ? 'bg-purple-900/50 text-purple-200'
                            : 'bg-cyan-900/50 text-cyan-200'
                        }`}
                      >
                        {agent.tier}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-1">
                        {agent.tagline}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{agent.description}</p>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                        {agent.model}
                      </span>
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                        {agent.tools} tools
                      </span>
                      <span className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                        {agent.role}
                      </span>
                    </div>

                    {/* Starter prompt */}
                    <div className="bg-black/40 border border-gray-800 rounded-lg p-2.5">
                      <div className="text-[9px] text-gray-600 uppercase tracking-wider font-mono mb-1">
                        Starter Prompt
                      </div>
                      <div className="text-xs text-cyan-300 font-mono">&ldquo;{agent.starterPrompt}&rdquo;</div>
                    </div>

                    {/* Try now button */}
                    <button
                      onClick={() => handleTryNow(agent)}
                      className={`w-full py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
                        copied === agent.handle
                          ? 'bg-green-500 text-black'
                          : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black'
                      }`}
                    >
                      {copied === agent.handle ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Copied — paste in FURL
                        </>
                      ) : (
                        <>
                          <Rocket className="w-3.5 h-3.5" />
                          Try Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-6xl mx-auto px-4 mt-12">
          <div className="bg-gradient-to-br from-gray-900/60 to-black border border-cyan-500/20 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <div className="text-cyan-400 font-mono text-xs mb-2">1. CLICK &ldquo;TRY NOW&rdquo;</div>
                <p className="text-gray-400">We copy the exact commands to your clipboard: <code className="text-cyan-400">jack managed &lt;handle&gt;</code> plus the starter prompt.</p>
              </div>
              <div>
                <div className="text-cyan-400 font-mono text-xs mb-2">2. OPEN FURL TERMINAL</div>
                <p className="text-gray-400">Go to any <Link href="/dex/nodes" className="text-cyan-400 hover:underline">/dex</Link> page. FURL lives at the top — it&apos;s always there.</p>
              </div>
              <div>
                <div className="text-cyan-400 font-mono text-xs mb-2">3. PASTE + ENTER</div>
                <p className="text-gray-400">Anthropic spins up the agent container in their cloud. Agent calls our custom tools, streams the answer back via SSE.</p>
              </div>
            </div>
          </div>
        </div>

        {/* BYOK note */}
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-3">
              <Coins className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-gray-300">
                <span className="font-semibold text-amber-400">BYOK Required.</span> SoundChain agents run on Anthropic&apos;s managed runtime — you need your own Anthropic API key (<code className="text-amber-400">sk-ant-...</code>). Get one at{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                  console.anthropic.com
                </a>. Claude Max subscription does NOT include API access — they are separate billing. Once you have a key, run <code className="text-amber-400">smith key sk-ant-...</code> in FURL.
              </div>
            </div>
          </div>
        </div>

        {/* Compare */}
        <div className="max-w-6xl mx-auto px-4 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">How We Compare</h2>
          <div className="bg-gradient-to-br from-gray-900/60 to-black border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-black/40">
                  <th className="text-left px-4 py-3 text-gray-400 font-mono text-xs">Feature</th>
                  <th className="text-left px-4 py-3 text-cyan-400 font-mono text-xs">SoundChain Agents</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-mono text-xs">Pinata Agent Templates</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">Runtime</td>
                  <td className="px-4 py-3">Anthropic Managed Agents (canonical)</td>
                  <td className="px-4 py-3">Pinata&apos;s own orchestration</td>
                </tr>
                <tr className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">Domain</td>
                  <td className="px-4 py-3">Music, rights, royalties, streaming</td>
                  <td className="px-4 py-3">General-purpose crypto infra</td>
                </tr>
                <tr className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">Agent Count</td>
                  <td className="px-4 py-3">12 in production</td>
                  <td className="px-4 py-3">3 launch partners (Alchemy, Tempo, ampersend)</td>
                </tr>
                <tr className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">Model Tiers</td>
                  <td className="px-4 py-3">Sonnet (orchestrators) + Haiku (specialists)</td>
                  <td className="px-4 py-3">Per-template, varies</td>
                </tr>
                <tr className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">Learning Loop</td>
                  <td className="px-4 py-3">Agent Academy — every session teaches</td>
                  <td className="px-4 py-3">None announced</td>
                </tr>
                <tr className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">Brain Scanner</td>
                  <td className="px-4 py-3">TRIBE v2 Neural — live FFT on every page</td>
                  <td className="px-4 py-3">N/A</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-400">Billing</td>
                  <td className="px-4 py-3">BYOK Anthropic — zero platform cost</td>
                  <td className="px-4 py-3">Per-template pricing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="max-w-6xl mx-auto px-4 mt-12 text-center">
          <Link
            href="/skill.md"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-mono"
          >
            Read the full architecture in skill.md →
          </Link>
        </div>
      </div>
    </>
  )
}

// Bare layout — no Layout wrapper = no RightSideNav vertical pills
AgentsPage.getLayout = ((page: ReactElement) => <>{page}</>) as CustomLayout
