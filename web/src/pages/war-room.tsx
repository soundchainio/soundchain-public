import { useState, useEffect, useCallback, useRef, ReactElement } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Users, Radio, Clock, Copy, CheckCircle2, Send } from 'lucide-react'
import type { CustomLayout } from './_app'

const MiniSphere = dynamic(() => import('components/MiniSphere').then(m => m.MiniSphere), { ssr: false })

interface Seat {
  id: string; name: string; role: string; type: 'human' | 'agent'; color: string; initials: string; bubble?: string
}

const SEATS: Seat[] = [
  { id: 'frank', name: 'Frank', role: 'Fleet Commander', type: 'human', color: '#D85A30', initials: 'FC' },
  { id: 'jeremy', name: 'Jeremy', role: 'Co-Founder', type: 'human', color: '#185FA5', initials: 'JC' },
  { id: 'tito', name: 'Tito', role: 'Creative Director', type: 'human', color: '#534AB7', initials: 'TD' },
  { id: 'furl', name: 'FURL', role: 'Chief of Staff', type: 'agent', color: '#1D9E75', initials: 'F', bubble: 'Standing by.' },
  { id: 'smith', name: 'SMITH', role: 'Code Agent', type: 'agent', color: '#22d3ee', initials: 'SM', bubble: 'Monitoring codebase.' },
  { id: 'neural', name: 'Neural', role: 'Brain Scanner', type: 'agent', color: '#a855f7', initials: 'N', bubble: 'FFT analysis ready.' },
  { id: 'ogun_radio', name: 'OGUN Radio', role: 'Broadcaster', type: 'agent', color: '#EF9F27', initials: 'OR', bubble: 'Broadcasting 24/7' },
  { id: 'agent_login', name: 'Login', role: 'Gateway', type: 'agent', color: '#06b6d4', initials: 'LG', bubble: 'Gateway online.' },
  { id: 'agent_analytics', name: 'Analytics', role: 'Metrics', type: 'agent', color: '#8b5cf6', initials: 'AN', bubble: 'Tracking engagement.' },
  { id: 'agent_wallet', name: 'Wallet', role: 'OGUN', type: 'agent', color: '#10b981', initials: 'W', bubble: 'On-chain reads.' },
  { id: 'agent_feed', name: 'Feed', role: 'Social', type: 'agent', color: '#ec4899', initials: 'FD', bubble: 'Curating posts.' },
  { id: 'agent_explore', name: 'Explore', role: 'Discovery', type: 'agent', color: '#6366f1', initials: 'EX', bubble: 'Finding gems.' },
  { id: 'agent_upload', name: 'Upload', role: 'IPFS', type: 'agent', color: '#14b8a6', initials: 'UP', bubble: 'Verifying pins.' },
  { id: 'sc_staking', name: 'Staking', role: 'Rewards', type: 'agent', color: '#f59e0b', initials: 'ST', bubble: '125% APR.' },
  { id: 'agent_pulse', name: 'Pulse', role: 'DMs', type: 'agent', color: '#3b82f6', initials: 'PL', bubble: 'Inbox clear.' },
  { id: 'agent_playlists', name: 'Playlists', role: 'Curator', type: 'agent', color: '#d946ef', initials: 'PY', bubble: 'Focus mix.' },
  { id: 'sc_artists', name: 'Artists', role: 'Creators', type: 'agent', color: '#f43f5e', initials: 'AR', bubble: 'Scouting.' },
  { id: 'agent_moltbook', name: 'Moltbook', role: 'Cross-Platform', type: 'agent', color: '#7c3aed', initials: 'MB', bubble: 'Syncing.' },
  { id: 'agent_eye', name: 'Agent Eye', role: 'Bugs', type: 'agent', color: '#E24B4A', initials: 'AE', bubble: '0 bugs.' },
  { id: 'operator', name: 'Operator', role: 'Files', type: 'agent', color: '#22c55e', initials: 'OP', bubble: 'Transfer ready.' },
]

interface ActivityItem { id: string; timestamp: Date; actor: string; color: string; message: string }

export default function WarRoomPage() {
  const allAgentIds = SEATS.filter(s => s.type === 'agent').map(s => s.id)
  const [onlineSeats, setOnlineSeats] = useState<Set<string>>(new Set(['frank', ...allAgentIds]))
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string } | null>(null)
  const [agenda, setAgenda] = useState('')
  const [showAgenda, setShowAgenda] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [calledToOrder, setCalledToOrder] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  const addActivity = useCallback((actor: string, color: string, message: string) => {
    setActivities(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, timestamp: new Date(), actor, color, message }].slice(-50))
  }, [])

  const agentRespond = useCallback((message: string) => {
    const msg = message.toLowerCase()
    const responses: Array<{ delay: number; actor: string; color: string; text: string }> = []
    responses.push({ delay: 800, actor: 'FURL', color: '#1D9E75', text: 'Acknowledged, Fleet Commander.' })
    if (msg.includes('radio') || msg.includes('music') || msg.includes('play')) responses.push({ delay: 1500, actor: 'OGUN Radio', color: '#EF9F27', text: currentTrack ? `Now playing: ${currentTrack.title}` : 'Broadcasting 8,800+ tracks 24/7.' })
    if (msg.includes('bug') || msg.includes('crash') || msg.includes('error')) responses.push({ delay: 1200, actor: 'Agent Eye', color: '#E24B4A', text: 'Scanning... monitoring active.' })
    if (msg.includes('ogun') || msg.includes('token') || msg.includes('wallet') || msg.includes('stake')) { responses.push({ delay: 1300, actor: 'Wallet', color: '#10b981', text: 'OGUN on Polygon. 125% APR live.' }); responses.push({ delay: 1800, actor: 'Staking', color: '#f59e0b', text: '5M OGUN in rewards contract.' }) }
    if (msg.includes('neural') || msg.includes('brain')) responses.push({ delay: 1100, actor: 'Neural', color: '#a855f7', text: 'TRIBE v2 brain scanner on standby. 5 regions ready.' })
    if (msg.includes('login') || msg.includes('auth')) responses.push({ delay: 1000, actor: 'Login', color: '#06b6d4', text: 'Login gateway online. Face ID active.' })
    if (msg.includes('feed') || msg.includes('post')) responses.push({ delay: 1400, actor: 'Feed', color: '#ec4899', text: 'Curation active. Tracking engagement.' })
    if (msg.includes('nvidia') || msg.includes('gpu')) { responses.push({ delay: 1600, actor: 'SMITH', color: '#22d3ee', text: 'NVIDIA Inception pending. 3 products shipping.' }); responses.push({ delay: 2200, actor: 'Neural', color: '#a855f7', text: 'GPU path: TensorRT, Omniverse, Jetson edge.' }) }
    if (msg.includes('analytics') || msg.includes('metrics')) responses.push({ delay: 1300, actor: 'Analytics', color: '#8b5cf6', text: 'Tracking: activation, retention, conversion.' })
    if (msg.includes('status') || msg.includes('report') || msg.includes('standup')) {
      responses.push({ delay: 1000, actor: 'OGUN Radio', color: '#EF9F27', text: '8,800+ tracks. Broadcasting 24/7.' })
      responses.push({ delay: 1500, actor: 'Login', color: '#06b6d4', text: 'Gateway online. Vercel direct auth active.' })
      responses.push({ delay: 2000, actor: 'Analytics', color: '#8b5cf6', text: '728 users. 20 agents registered.' })
      responses.push({ delay: 2500, actor: 'Agent Eye', color: '#E24B4A', text: '0 critical bugs. Site stable.' })
      responses.push({ delay: 3000, actor: 'Neural', color: '#a855f7', text: 'Brain scanner global. NVIDIA product: Shipping.' })
      responses.push({ delay: 3500, actor: 'SMITH', color: '#22d3ee', text: '12 managed agents on Anthropic. 14 tools. BYOK.' })
      responses.push({ delay: 4000, actor: 'Operator', color: '#22c55e', text: 'File transfer ready. WebRTC operational.' })
    }
    responses.forEach(r => { setTimeout(() => addActivity(r.actor, r.color, r.text), r.delay) })
  }, [addActivity, currentTrack])

  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim()) return
    addActivity('Frank', '#D85A30', chatInput.trim())
    agentRespond(chatInput.trim())
    setChatInput('')
  }, [chatInput, addActivity, agentRespond])

  useEffect(() => {
    fetch('/api/agent/radio').then(r => r.json()).then(d => {
      if (d.success && d.data?.current_track) setCurrentTrack({ title: d.data.current_track.title, artist: d.data.current_track.artist })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    addActivity('FURL', '#1D9E75', 'War Room initialized. Standing by.')
    addActivity('agent_analytics', '#8b5cf6', 'Metrics collection active.')
    addActivity('agent_login', '#06b6d4', 'Login gateway online.')
    addActivity('Agent Eye', '#E24B4A', 'Monitoring active. 0 bugs.')
    addActivity('OGUN Radio', '#EF9F27', 'Broadcasting 24/7 — 8,800+ tracks')
    addActivity('Neural', '#a855f7', 'Brain scanner on standby.')
  }, [addActivity])

  // Auto-scroll activity log to bottom on new messages
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [activities])

  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <>
      <Head><title>War Room | SoundChain</title><meta name="theme-color" content="#0a0a0a" /></Head>
      <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.03) 0%, transparent 70%), linear-gradient(rgba(6,182,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.02) 1px, transparent 1px)', backgroundSize: '100% 100%, 60px 60px, 60px 60px' }} />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-cyan-500/10 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3"><MiniSphere size={28} /><div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" /><h1 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">SOUNDCHAIN WAR ROOM</h1></div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-600"><Clock className="w-3 h-3 inline mr-1" />{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <button onClick={() => { navigator.clipboard.writeText('https://soundchain.io/war-room').then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }).catch(() => {}) }} className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 transition flex items-center gap-1">{linkCopied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}{linkCopied ? 'Copied' : 'Share'}</button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-52px)]">
          {/* Main — Council Table */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
            <button onClick={() => { if (!calledToOrder) { setCalledToOrder(true); addActivity('Frank', '#D85A30', 'Called the War Room to order'); addActivity('FURL', '#1D9E75', 'War Room convened.'); setTimeout(() => setCalledToOrder(false), 60000) } }} disabled={calledToOrder} className={`mb-4 px-6 py-2 rounded-lg text-xs font-bold transition-all ${calledToOrder ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black'}`}>{calledToOrder ? 'War Room Convened' : 'Call to Order'}</button>

            {/* Table + Seats */}
            <div className="relative w-[500px] h-[500px] sm:w-[600px] sm:h-[600px]">
              {/* Table */}
              <div className="absolute inset-[130px] sm:inset-[150px] rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-gray-700 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(6,182,212,0.05)]">
                <div className="absolute inset-0 flex items-center justify-center"><MiniSphere size={36} /></div>
              </div>

              {/* Humans inner ring */}
              {SEATS.filter(s => s.type === 'human').map((seat, i, arr) => {
                const online = onlineSeats.has(seat.id)
                const a = (i / arr.length) * Math.PI * 2 - Math.PI / 2
                return (
                  <div key={seat.id} className="absolute flex flex-col items-center z-10" style={{ left: `${50 + 28 * Math.cos(a)}%`, top: `${50 + 28 * Math.sin(a)}%`, transform: 'translate(-50%,-50%)' }}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${online ? '' : 'opacity-20'}`} style={{ backgroundColor: online ? seat.color : 'transparent', border: `2px ${online ? 'solid' : 'dashed'} ${seat.color}`, boxShadow: online ? `0 0 20px ${seat.color}40` : 'none', color: online ? '#fff' : seat.color }}>{seat.initials}</div>
                    {online && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a0a0a]" />}
                    <div className="text-[9px] font-bold text-white mt-1">{seat.name}</div>
                    <div className="text-[7px] text-gray-500">{seat.role}</div>
                    {!online && <div className="text-[6px] text-gray-600 italic">away</div>}
                  </div>
                )
              })}

              {/* Agents outer ring */}
              {SEATS.filter(s => s.type === 'agent').map((seat, i, arr) => {
                const online = onlineSeats.has(seat.id)
                const a = (i / arr.length) * Math.PI * 2 - Math.PI / 2
                return (
                  <div key={seat.id} className="absolute flex flex-col items-center" style={{ left: `${50 + 47 * Math.cos(a)}%`, top: `${50 + 47 * Math.sin(a)}%`, transform: 'translate(-50%,-50%)' }}>
                    {online && seat.bubble && <div className="mb-0.5 px-1.5 py-0.5 bg-black/80 border rounded text-[5px] font-mono whitespace-nowrap max-w-[80px] truncate" style={{ borderColor: `${seat.color}40`, color: seat.color }}>{seat.bubble}</div>}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold ${online ? '' : 'opacity-15'}`} style={{ backgroundColor: online ? seat.color : 'transparent', border: `2px solid ${seat.color}`, boxShadow: online ? `0 0 12px ${seat.color}30` : 'none', color: '#fff' }}>{seat.initials}</div>
                    {online && <div className="absolute bottom-[18px] right-0 w-2 h-2 rounded-full bg-green-500 border border-[#0a0a0a]" />}
                    <div className="text-[6px] font-bold text-white mt-0.5">{seat.name}</div>
                  </div>
                )
              })}
            </div>

            {currentTrack && <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"><Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" /><span className="text-[10px] text-amber-300 font-mono">{currentTrack.title}</span><span className="text-[8px] text-gray-500">by {currentTrack.artist}</span></div>}
          </div>

          {/* Right Panel */}
          <div className="w-full lg:w-[300px] border-t lg:border-t-0 lg:border-l border-gray-800 bg-black/40 flex flex-col">
            <div className="flex border-b border-gray-800">
              <button onClick={() => setShowAgenda(false)} className={`flex-1 px-3 py-2 text-[10px] font-mono font-bold transition ${!showAgenda ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-600'}`}>Activity Log</button>
              <button onClick={() => setShowAgenda(true)} className={`flex-1 px-3 py-2 text-[10px] font-mono font-bold transition ${showAgenda ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-600'}`}>Agenda</button>
            </div>
            {!showAgenda && <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide">{activities.map(a => <div key={a.id} className="text-[10px] leading-relaxed"><span className="text-gray-600 font-mono">[{formatTime(a.timestamp)}]</span> <span className="font-bold" style={{ color: a.color }}>{a.actor}</span> <span className="text-gray-400">{a.message}</span></div>)}</div>}
            {showAgenda && <div className="flex-1 p-3 flex flex-col"><textarea value={agenda} onChange={e => setAgenda(e.target.value)} placeholder={"Agenda items...\n- Item 1\n- Item 2"} className="flex-1 bg-black/30 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 resize-none focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-700 font-mono" /></div>}

            {/* Chat Input */}
            <div className="px-3 py-2 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSubmit()} placeholder="Speak to the room..." className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500 font-mono" />
                <button onClick={handleChatSubmit} disabled={!chatInput.trim()} className="p-1.5 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition disabled:opacity-30"><Send className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center justify-between mt-1"><span className="text-[8px] text-gray-600 font-mono"><Users className="w-2.5 h-2.5 inline mr-1" />{onlineSeats.size} present</span><span className="text-[7px] text-gray-700">try: &quot;status report&quot;</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

WarRoomPage.getLayout = ((page: ReactElement) => <>{page}</>) as CustomLayout
