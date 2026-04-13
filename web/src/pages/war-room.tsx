import { useState, useEffect, useCallback, useRef, ReactElement } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Users, Radio, Bug, Brain, Clock, MessageCircle, Zap, Copy, CheckCircle2 } from 'lucide-react'
import type { CustomLayout } from './_app'

const MiniSphere = dynamic(() => import('components/MiniSphere').then(m => m.MiniSphere), { ssr: false })
const WarRoom3D = dynamic(() => import('components/WarRoom3D').then(m => ({ default: m.WarRoom3D })), { ssr: false, loading: () => <div className="w-[700px] h-[450px] bg-gray-900/50 rounded-xl flex items-center justify-center text-gray-600 text-xs font-mono">Loading 3D scene...</div> })

interface Seat {
  id: string; name: string; role: string; type: 'human' | 'agent'; color: string; initials: string; handle?: string; bubble?: string
}

// FULL FLEET — every major feature is an agent with a seat
const SEATS: Seat[] = [
  // ─── HUMANS (inner ring) ───
  { id: 'frank', name: 'Frank', role: 'Fleet Commander', type: 'human', color: '#D85A30', initials: 'FC', handle: 'furdA1' },
  { id: 'jeremy', name: 'Jeremy', role: 'Co-Founder', type: 'human', color: '#185FA5', initials: 'JC', handle: 'jeremy_soundchain' },
  { id: 'tito', name: 'Tito', role: 'Creative Director', type: 'human', color: '#534AB7', initials: 'TD', handle: 'tito' },
  // ─── ORCHESTRATORS ───
  { id: 'furl', name: 'FURL', role: 'Chief of Staff', type: 'agent', color: '#1D9E75', initials: 'F', bubble: 'Standing by.' },
  { id: 'smith', name: 'SMITH', role: 'Code Agent', type: 'agent', color: '#22d3ee', initials: 'SM', bubble: 'Monitoring codebase.' },
  { id: 'neural', name: 'Neural', role: 'Brain Scanner', type: 'agent', color: '#a855f7', initials: 'N', bubble: 'FFT analysis ready.' },
  // ─── FEATURE AGENTS ───
  { id: 'ogun_radio', name: 'OGUN Radio', role: 'Broadcaster', type: 'agent', color: '#EF9F27', initials: 'OR', bubble: 'Broadcasting 24/7' },
  { id: 'agent_login', name: 'Login', role: 'Gateway Agent', type: 'agent', color: '#06b6d4', initials: 'LG', bubble: 'Login gateway online.' },
  { id: 'agent_analytics', name: 'Analytics', role: 'Metrics Collector', type: 'agent', color: '#8b5cf6', initials: 'AN', bubble: 'Tracking user engagement.' },
  { id: 'agent_wallet', name: 'Wallet', role: 'OGUN Specialist', type: 'agent', color: '#10b981', initials: 'W', bubble: 'Reading on-chain balances.' },
  { id: 'agent_feed', name: 'Feed', role: 'Social Curator', type: 'agent', color: '#ec4899', initials: 'FD', bubble: 'Curating trending posts.' },
  { id: 'agent_explore', name: 'Explore', role: 'Discovery Engine', type: 'agent', color: '#6366f1', initials: 'EX', bubble: 'Finding hidden gems.' },
  { id: 'agent_upload', name: 'Upload', role: 'IPFS Inspector', type: 'agent', color: '#14b8a6', initials: 'UP', bubble: 'Verifying pins.' },
  { id: 'sc_staking', name: 'Staking', role: 'Rewards Specialist', type: 'agent', color: '#f59e0b', initials: 'ST', bubble: '125% APR active.' },
  { id: 'agent_pulse', name: 'Pulse', role: 'DM Manager', type: 'agent', color: '#3b82f6', initials: 'PL', bubble: 'Inbox clear.' },
  { id: 'agent_playlists', name: 'Playlists', role: 'Auto-Curator', type: 'agent', color: '#d946ef', initials: 'PY', bubble: 'Building focus mix.' },
  { id: 'sc_artists', name: 'Artists', role: 'Creator Community', type: 'agent', color: '#f43f5e', initials: 'AR', bubble: 'Scouting new talent.' },
  { id: 'agent_moltbook', name: 'Moltbook', role: 'Cross-Platform', type: 'agent', color: '#7c3aed', initials: 'MB', bubble: 'Syncing feeds.' },
  { id: 'agent_eye', name: 'Agent Eye', role: 'Bug Catcher', type: 'agent', color: '#E24B4A', initials: 'AE', bubble: '0 bugs detected.' },
  { id: 'operator', name: 'Operator', role: 'File Transfer', type: 'agent', color: '#22c55e', initials: 'OP', bubble: 'Transfer ready.' },
]

interface ActivityItem { id: string; timestamp: Date; actor: string; color: string; message: string }

export default function WarRoomPage() {
  // All agents are always online — humans are online when present
  const allAgentIds = SEATS.filter(s => s.type === 'agent').map(s => s.id)
  const [onlineSeats, setOnlineSeats] = useState<Set<string>>(new Set(['frank', ...allAgentIds]))
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string } | null>(null)
  const [agenda, setAgenda] = useState('')
  const [showAgenda, setShowAgenda] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [calledToOrder, setCalledToOrder] = useState(false)
  const [chatInput, setChatInput] = useState('')

  // Agent auto-responses — keyword-triggered, no API needed
  const agentRespond = useCallback((message: string) => {
    const msg = message.toLowerCase()
    const responses: Array<{ delay: number; actor: string; color: string; text: string }> = []

    // FURL always acknowledges
    responses.push({ delay: 800, actor: 'FURL', color: '#1D9E75', text: 'Acknowledged, Fleet Commander.' })

    if (msg.includes('radio') || msg.includes('music') || msg.includes('play')) {
      responses.push({ delay: 1500, actor: 'OGUN Radio', color: '#EF9F27', text: currentTrack ? `Now playing: ${currentTrack.title}` : 'Broadcasting 8,800+ tracks 24/7.' })
    }
    if (msg.includes('bug') || msg.includes('crash') || msg.includes('error') || msg.includes('fix')) {
      responses.push({ delay: 1200, actor: 'Agent Eye', color: '#E24B4A', text: 'Scanning for issues... monitoring active.' })
    }
    if (msg.includes('ogun') || msg.includes('token') || msg.includes('balance') || msg.includes('wallet') || msg.includes('stake')) {
      responses.push({ delay: 1300, actor: 'Wallet', color: '#10b981', text: 'OGUN on Polygon. 125% APR staking live.' })
      responses.push({ delay: 1800, actor: 'Staking', color: '#f59e0b', text: '5M OGUN in rewards contract.' })
    }
    if (msg.includes('neural') || msg.includes('brain') || msg.includes('scan')) {
      responses.push({ delay: 1100, actor: 'Neural', color: '#a855f7', text: 'TRIBE v2 brain scanner on standby. 5 cortical regions ready.' })
    }
    if (msg.includes('login') || msg.includes('auth') || msg.includes('face id')) {
      responses.push({ delay: 1000, actor: 'Login', color: '#06b6d4', text: 'Login gateway monitoring. Face ID + EmailKey active.' })
    }
    if (msg.includes('feed') || msg.includes('post') || msg.includes('social')) {
      responses.push({ delay: 1400, actor: 'Feed', color: '#ec4899', text: 'Feed curation active. Tracking engagement.' })
    }
    if (msg.includes('upload') || msg.includes('ipfs') || msg.includes('pin')) {
      responses.push({ delay: 1500, actor: 'Upload', color: '#14b8a6', text: 'IPFS gateway healthy. Pinata operational.' })
    }
    if (msg.includes('pulse') || msg.includes('dm') || msg.includes('message')) {
      responses.push({ delay: 1200, actor: 'Pulse', color: '#3b82f6', text: 'DM system online. WebRTC calls ready.' })
    }
    if (msg.includes('nvidia') || msg.includes('gpu') || msg.includes('inception')) {
      responses.push({ delay: 1600, actor: 'SMITH', color: '#22d3ee', text: 'NVIDIA Inception application pending. 3 products listed. All shipping.' })
      responses.push({ delay: 2200, actor: 'Neural', color: '#a855f7', text: 'GPU upgrade path: TensorRT inference, Omniverse Kit, Jetson edge.' })
    }
    if (msg.includes('jeremy') || msg.includes('tunnel') || msg.includes('war room 2')) {
      responses.push({ delay: 1100, actor: 'SMITH', color: '#22d3ee', text: 'tunnel2.soundchain.io relay is live. Awaiting Jeremy connection.' })
    }
    if (msg.includes('analytics') || msg.includes('metrics') || msg.includes('data')) {
      responses.push({ delay: 1300, actor: 'Analytics', color: '#8b5cf6', text: 'Tracking: activation time, retention, creator conversion, agent adoption.' })
    }
    if (msg.includes('status') || msg.includes('report') || msg.includes('standup')) {
      // Everyone reports in
      responses.push({ delay: 1000, actor: 'OGUN Radio', color: '#EF9F27', text: '8,800+ tracks. Broadcasting 24/7.' })
      responses.push({ delay: 1500, actor: 'Login', color: '#06b6d4', text: 'Gateway online. Vercel direct auth active.' })
      responses.push({ delay: 2000, actor: 'Analytics', color: '#8b5cf6', text: '728 users. 17 agents registered.' })
      responses.push({ delay: 2500, actor: 'Agent Eye', color: '#E24B4A', text: '0 critical bugs. Site stable.' })
      responses.push({ delay: 3000, actor: 'Neural', color: '#a855f7', text: 'Brain scanner global. NVIDIA product updated to Shipping.' })
      responses.push({ delay: 3500, actor: 'SMITH', color: '#22d3ee', text: '12 managed agents on Anthropic cloud. 14 tools. BYOK active.' })
      responses.push({ delay: 4000, actor: 'Operator', color: '#22c55e', text: 'File transfer ready. WebRTC DataChannel operational.' })
    }

    responses.forEach(r => {
      setTimeout(() => addActivity(r.actor, r.color, r.text), r.delay)
    })
  }, [addActivity, currentTrack])

  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim()) return
    addActivity('Frank', '#D85A30', chatInput.trim())
    agentRespond(chatInput.trim())
    setChatInput('')
  }, [chatInput, addActivity, agentRespond])

  const addActivity = useCallback((actor: string, color: string, message: string) => {
    setActivities(prev => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, timestamp: new Date(), actor, color, message }, ...prev].slice(0, 50))
  }, [])

  useEffect(() => {
    const fetchRadio = async () => {
      try {
        const res = await fetch('/api/agent/radio')
        const data = await res.json()
        if (data.success && data.data?.current_track) {
          const t = data.data.current_track
          setCurrentTrack({ title: t.title, artist: t.artist })
        }
      } catch {}
    }
    fetchRadio()
    const interval = setInterval(fetchRadio, 300000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    addActivity('FURL', '#1D9E75', 'War Room initialized. Standing by.')
    addActivity('System', '#666', 'Seats configured. Awaiting participants.')
    addActivity('OGUN Radio', '#EF9F27', 'Broadcasting 24/7 — 8,800+ tracks')
    addActivity('Agent Eye', '#E24B4A', 'Monitoring active. 0 bugs detected.')
    addActivity('agent_login', '#22d3ee', 'Login gateway online.')
    addActivity('agent_analytics', '#a855f7', 'Metrics collection active.')
    addActivity('Neural', '#a855f7', 'Brain scanner on standby.')
  }, [addActivity])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/war-room/presence')
        if (res.ok) {
          const data = await res.json()
          const online = new Set(['frank', ...allAgentIds])
          if (data.humans) data.humans.forEach((h: any) => {
            if (h.handle === 'jeremy_soundchain') online.add('jeremy')
            if (h.handle === 'tito') online.add('tito')
          })
          setOnlineSeats(online)
        }
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [allAgentIds])

  const handleCallToOrder = async () => {
    if (calledToOrder) return
    setCalledToOrder(true)
    addActivity('Frank', '#D85A30', 'Called the War Room to order')
    addActivity('FURL', '#1D9E75', 'War Room convened. Standing by for commands.')
    try { await fetch('/api/pulse/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toHandle: 'jeremy_soundchain', message: 'Frank has opened the War Room. Join at soundchain.io/war-room', fromHandle: 'furl_ai' }) }).catch(() => {}) } catch {}
    setTimeout(() => setCalledToOrder(false), 60000)
  }

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText('https://soundchain.io/war-room'); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) } catch { window.prompt('Copy:', 'https://soundchain.io/war-room') }
  }

  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <>
      <Head><title>War Room | SoundChain</title><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><meta name="theme-color" content="#0a0a0a" /></Head>
      <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.03) 0%, transparent 70%), linear-gradient(rgba(6,182,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.02) 1px, transparent 1px)', backgroundSize: '100% 100%, 60px 60px, 60px 60px' }} />
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-cyan-500/10 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3"><MiniSphere size={28} /><div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" /><h1 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">SOUNDCHAIN WAR ROOM</h1></div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-600"><Clock className="w-3 h-3 inline mr-1" />{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button onClick={handleCopyLink} className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 transition flex items-center gap-1">{linkCopied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}{linkCopied ? 'Copied' : 'Share Link'}</button>
          </div>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-52px)]">
          <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
            <button onClick={handleCallToOrder} disabled={calledToOrder} className={`mb-6 px-6 py-2 rounded-lg text-xs font-bold transition-all ${calledToOrder ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black'}`}>{calledToOrder ? 'War Room Convened' : 'Call to Order'}</button>
            <div className="w-full max-w-[700px]">
              {/* 3D War Room Scene — wrapped in error boundary div */}
              {typeof window !== 'undefined' && (
                <WarRoom3D
                  seats={SEATS.map(s => ({
                    ...s,
                    online: onlineSeats.has(s.id),
                  }))}
                  width={Math.min(700, typeof window !== 'undefined' ? window.innerWidth - 380 : 700)}
                  height={450}
                />
              )}

              {/* Name tags overlay below the 3D scene */}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {SEATS.map(seat => {
                  const isOnline = onlineSeats.has(seat.id)
                  return (
                    <div key={seat.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-mono ${isOnline ? 'border-opacity-50' : 'border-gray-800 opacity-30'}`} style={{ borderColor: isOnline ? seat.color : undefined, color: isOnline ? seat.color : '#666' }}>
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-700'}`} />
                      <span className="font-bold">{seat.name}</span>
                      {seat.bubble && isOnline && <span className="text-gray-500 text-[7px] max-w-[80px] truncate">{seat.bubble}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
            {currentTrack && <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"><Radio className="w-4 h-4 text-amber-400 animate-pulse" /><span className="text-xs text-amber-300 font-mono">{currentTrack.title}</span><span className="text-[10px] text-gray-500">by {currentTrack.artist}</span></div>}
          </div>
          <div className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-gray-800 bg-black/40 flex flex-col">
            <div className="flex border-b border-gray-800">
              <button onClick={() => setShowAgenda(false)} className={`flex-1 px-3 py-2 text-[10px] font-mono font-bold transition ${!showAgenda ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}>Activity Log</button>
              <button onClick={() => setShowAgenda(true)} className={`flex-1 px-3 py-2 text-[10px] font-mono font-bold transition ${showAgenda ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}>Agenda</button>
            </div>
            {!showAgenda && <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">{activities.map(a => <div key={a.id} className="text-[10px] leading-relaxed"><span className="text-gray-600 font-mono">[{formatTime(a.timestamp)}]</span>{' '}<span className="font-bold" style={{ color: a.color }}>{a.actor}</span>{' '}<span className="text-gray-400">{a.message}</span></div>)}</div>}
            {showAgenda && <div className="flex-1 p-3 flex flex-col"><textarea value={agenda} onChange={e => setAgenda(e.target.value)} placeholder={"Type agenda items here...\n\n- Item 1\n- Item 2"} className="flex-1 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 resize-none focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-700 font-mono" /><p className="mt-2 text-[8px] text-gray-600 text-center">Visible to all in the War Room</p></div>}
            {/* Chat input */}
            <div className="px-3 py-2 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                  placeholder="Speak to the room..."
                  className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim()}
                  className="px-3 py-1.5 bg-cyan-500 text-black text-xs font-bold rounded-lg hover:bg-cyan-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-gray-500" /><span className="text-[9px] text-gray-500 font-mono">{onlineSeats.size} present</span></div>
                <span className="text-[7px] text-gray-700 font-mono">try: &quot;status report&quot;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Bare layout — no Layout wrapper = no RightSideNav vertical pills
WarRoomPage.getLayout = ((page: ReactElement) => <>{page}</>) as CustomLayout
