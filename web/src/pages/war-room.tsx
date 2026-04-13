import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { Users, Radio, Bug, Brain, Clock, MessageCircle, Zap, Copy, CheckCircle2 } from 'lucide-react'

interface Seat {
  id: string; name: string; role: string; type: 'human' | 'agent'; color: string; initials: string; handle?: string
}

const SEATS: Seat[] = [
  { id: 'frank', name: 'Frank', role: 'Fleet Commander', type: 'human', color: '#D85A30', initials: 'FC', handle: 'furdA1' },
  { id: 'jeremy', name: 'Jeremy', role: 'Co-Founder', type: 'human', color: '#185FA5', initials: 'JC', handle: 'jeremy_soundchain' },
  { id: 'tito', name: 'Tito', role: 'Creative Director', type: 'human', color: '#534AB7', initials: 'TD', handle: 'tito' },
  { id: 'furl', name: 'FURL', role: 'Chief of Staff', type: 'agent', color: '#1D9E75', initials: 'F' },
  { id: 'agent_eye', name: 'Agent Eye', role: 'Bug Catcher', type: 'agent', color: '#E24B4A', initials: 'AE' },
  { id: 'ogun_radio', name: 'OGUN Radio', role: 'Broadcaster', type: 'agent', color: '#EF9F27', initials: 'OR' },
]

interface ActivityItem { id: string; timestamp: Date; actor: string; color: string; message: string }

export default function WarRoomPage() {
  const [onlineSeats, setOnlineSeats] = useState<Set<string>>(new Set(['frank', 'furl', 'ogun_radio', 'agent_eye']))
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string } | null>(null)
  const [agenda, setAgenda] = useState('')
  const [showAgenda, setShowAgenda] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [calledToOrder, setCalledToOrder] = useState(false)

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
    setOnlineSeats(new Set(['frank', 'furl', 'ogun_radio', 'agent_eye']))
    const poll = async () => {
      try {
        const res = await fetch('/api/war-room/presence')
        if (res.ok) {
          const data = await res.json()
          const online = new Set(['frank', 'furl', 'ogun_radio', 'agent_eye'])
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
  }, [])

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
          <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" /><h1 className="text-sm font-mono font-bold text-cyan-400 tracking-wider">SOUNDCHAIN WAR ROOM</h1></div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-600"><Clock className="w-3 h-3 inline mr-1" />{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button onClick={handleCopyLink} className="text-[10px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 transition flex items-center gap-1">{linkCopied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}{linkCopied ? 'Copied' : 'Share Link'}</button>
          </div>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-52px)]">
          <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
            <button onClick={handleCallToOrder} disabled={calledToOrder} className={`mb-6 px-6 py-2 rounded-lg text-xs font-bold transition-all ${calledToOrder ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black'}`}>{calledToOrder ? 'War Room Convened' : 'Call to Order'}</button>
            <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[500px] lg:h-[500px]">
              <div className="absolute inset-[60px] sm:inset-[80px] lg:inset-[100px] rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-gray-700 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(6,182,212,0.05)]">
                <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[10px] font-mono text-gray-600 tracking-[0.2em]">SOUNDCHAIN</div><div className="text-[8px] font-mono text-gray-700">WAR ROOM</div></div></div>
              </div>
              {SEATS.map((seat, i) => {
                const isOnline = onlineSeats.has(seat.id)
                const angle = (i / SEATS.length) * 2 * Math.PI - Math.PI / 2
                const left = 50 + 48 * Math.cos(angle)
                const top = 50 + 48 * Math.sin(angle)
                return (
                  <div key={seat.id} className="absolute flex flex-col items-center" style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="relative">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all ${isOnline ? '' : 'opacity-20'}`} style={{ backgroundColor: isOnline ? seat.color : 'transparent', border: `2px ${isOnline ? 'solid' : 'dashed'} ${seat.color}`, boxShadow: isOnline ? `0 0 20px ${seat.color}40` : 'none', color: isOnline ? '#fff' : seat.color }}>{seat.initials}</div>
                      {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0a0a0a]" />}
                      {isOnline && seat.type === 'agent' && <div className="absolute inset-0 rounded-full animate-ping" style={{ border: `1px solid ${seat.color}`, opacity: 0.3, animationDuration: '3s' }} />}
                    </div>
                    <div className="mt-1.5 text-center"><div className="text-[10px] font-bold text-white whitespace-nowrap">{seat.name}</div><div className="text-[8px] text-gray-500 whitespace-nowrap">{seat.role}</div>{!isOnline && seat.type === 'human' && <div className="text-[7px] text-gray-600 italic">away</div>}</div>
                  </div>
                )
              })}
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
            <div className="px-3 py-2 border-t border-gray-800 flex items-center justify-between"><div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-gray-500" /><span className="text-[9px] text-gray-500 font-mono">{onlineSeats.size} present</span></div><span className="text-[8px] text-gray-700 font-mono">Phase 1</span></div>
          </div>
        </div>
      </div>
    </>
  )
}
