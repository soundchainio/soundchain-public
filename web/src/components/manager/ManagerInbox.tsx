import { useCallback, useEffect, useState } from 'react'
import {
  Inbox, Calendar, Users, Briefcase, Mail, MapPin, DollarSign,
  Clock, Globe, Archive, Loader2, ChevronDown, RefreshCw,
} from 'lucide-react'

// ─── MANAGER inbox panel (owner-only) ─────────────────────────────────────────
// Where inquiries delivered via /api/manager/inquiry actually land for the pro.
// Bookings no longer vanish into a visitor's browser — they show up here, with
// the contact, the structured terms, and the language the booker reached out in.

interface InquiryFields {
  eventType?: string
  date?: string
  location?: string
  budgetRange?: string
  artistProjectName?: string
  collabType?: string
  workLink?: string
  company?: string
  inquiryType?: string
}

interface Inquiry {
  id: string
  type: 'booking' | 'collab' | 'business' | 'hire'
  name: string
  email: string
  fields: InquiryFields
  message: string
  visitorLang: string
  read: boolean
  status: string
  createdAt: string | null
}

const TYPE_META: Record<string, { label: string; icon: typeof Calendar; color: string }> = {
  booking: { label: 'Booking', icon: Calendar, color: 'cyan' },
  collab: { label: 'Collab', icon: Users, color: 'purple' },
  business: { label: 'Business', icon: Briefcase, color: 'emerald' },
  hire: { label: 'Hire', icon: Briefcase, color: 'amber' },
}

// Best-effort: turn a BCP-47 tag into a human language name (the booker's tongue).
function langName(tag: string): string {
  if (!tag) return ''
  try {
    const dn = new (Intl as any).DisplayNames([typeof navigator !== 'undefined' ? navigator.language : 'en'], { type: 'language' })
    return dn.of(tag) || tag
  } catch { return tag }
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const s = Math.floor((Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function ManagerInbox() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/manager/inquiries')
      if (res.ok) {
        const data = await res.json()
        setInquiries(data.inquiries || [])
        setUnread(data.unread || 0)
      }
    } catch { /* keep prior state */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = useCallback(async (id: string) => {
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, read: true } : i))
    setUnread(prev => Math.max(0, prev - 1))
    try { await fetch('/api/manager/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'read' }) }) } catch {}
  }, [])

  const archive = useCallback(async (id: string) => {
    setInquiries(prev => prev.filter(i => i.id !== id))
    try { await fetch('/api/manager/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'archive' }) }) } catch {}
  }, [])

  const toggle = (i: Inquiry) => {
    const next = expanded === i.id ? null : i.id
    setExpanded(next)
    if (next && !i.read) markRead(i.id)
  }

  return (
    <section className="backdrop-blur-xl bg-black/80 border border-cyan-500/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Inbox</span>
          {unread > 0 && (
            <span className="text-[10px] font-bold text-black bg-cyan-400 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); load() }}
            className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-cyan-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800/50">
          {loading && inquiries.length === 0 ? (
            <div className="p-6 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading inbox...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">No inquiries yet.</p>
              <p className="text-[11px] text-gray-600 mt-1">Bookings, collabs, and business inquiries land here — and ping you on the go.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50 max-h-[60vh] overflow-y-auto">
              {inquiries.map(i => {
                const meta = TYPE_META[i.type] || TYPE_META.business
                const MetaIcon = meta.icon
                const isOpen = expanded === i.id
                return (
                  <div key={i.id} className={`${!i.read ? 'bg-cyan-500/[0.04]' : ''}`}>
                    <button onClick={() => toggle(i)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition-colors">
                      {!i.read && <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                      <MetaIcon className={`w-4 h-4 flex-shrink-0 text-${meta.color}-400`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${!i.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                          {i.name} <span className="text-gray-600">· {meta.label}</span>
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {i.fields.location ? `${i.fields.location} · ` : ''}{i.fields.eventType || i.fields.collabType || i.fields.inquiryType || (i.message ? i.message.slice(0, 48) : 'No details')}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(i.createdAt)}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 space-y-2.5 text-sm">
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
                          <a href={`mailto:${i.email}`} className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300">
                            <Mail className="w-3.5 h-3.5" /> {i.email}
                          </a>
                          {i.visitorLang && (
                            <span className="flex items-center gap-1.5 text-gray-400" title="Language the booker reached out in">
                              <Globe className="w-3.5 h-3.5" /> {langName(i.visitorLang)}
                            </span>
                          )}
                          {i.fields.date && (
                            <span className="flex items-center gap-1.5 text-gray-400"><Calendar className="w-3.5 h-3.5" /> {i.fields.date}</span>
                          )}
                          {i.fields.location && (
                            <span className="flex items-center gap-1.5 text-gray-400"><MapPin className="w-3.5 h-3.5" /> {i.fields.location}</span>
                          )}
                          {i.fields.budgetRange && (
                            <span className="flex items-center gap-1.5 text-green-400"><DollarSign className="w-3.5 h-3.5" /> {i.fields.budgetRange}</span>
                          )}
                          {i.createdAt && (
                            <span className="flex items-center gap-1.5 text-gray-500"><Clock className="w-3.5 h-3.5" /> {new Date(i.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* Type-specific extras */}
                        {(i.fields.eventType || i.fields.collabType || i.fields.inquiryType || i.fields.company || i.fields.artistProjectName || i.fields.workLink) && (
                          <div className="flex flex-wrap gap-1.5">
                            {[i.fields.eventType, i.fields.collabType, i.fields.inquiryType, i.fields.company, i.fields.artistProjectName].filter(Boolean).map((v, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full bg-white/5 border border-gray-700 text-[10px] text-gray-300">{v}</span>
                            ))}
                            {i.fields.workLink && (
                              <a href={i.fields.workLink} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] text-purple-300 hover:bg-purple-500/20">Work link ↗</a>
                            )}
                          </div>
                        )}

                        {i.message && (
                          <p className="text-gray-300 text-[13px] leading-relaxed bg-white/5 rounded-lg p-3 whitespace-pre-wrap">{i.message}</p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`mailto:${i.email}?subject=${encodeURIComponent('Re: your ' + meta.label.toLowerCase() + ' inquiry')}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-black bg-cyan-400 hover:bg-cyan-300 transition-colors"
                          >
                            Reply
                          </a>
                          <button
                            onClick={() => archive(i.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
