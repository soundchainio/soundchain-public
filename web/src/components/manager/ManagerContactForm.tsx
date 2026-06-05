import { useState } from 'react'
import { Send, CheckCircle, Calendar, Users, Briefcase, Loader2 } from 'lucide-react'

type FormType = 'booking' | 'collab' | 'business'

interface ManagerContactFormProps {
  type: FormType
  profileId: string
  artistName: string
  onClose: () => void
}

const EVENT_TYPES = ['Concert/Festival', 'Private Event', 'Corporate Event', 'Club Night', 'Opening Act', 'Residency', 'Other']
const BUDGET_RANGES = ['Under $500', '$500 - $1,000', '$1,000 - $2,500', '$2,500 - $5,000', '$5,000 - $10,000', '$10,000+', 'Negotiable']
const COLLAB_TYPES = ['Feature/Guest Verse', 'Co-Production', 'Remix', 'Co-Write', 'Live Performance', 'Music Video', 'Other']
const INQUIRY_TYPES = ['Licensing/Sync', 'Press/Media', 'Sponsorship', 'Management', 'Label', 'Distribution', 'Other']

const FORM_CONFIG: Record<FormType, { title: string; icon: typeof Calendar; color: string }> = {
  booking: { title: 'Book This Artist', icon: Calendar, color: 'cyan' },
  collab: { title: 'Propose Collaboration', icon: Users, color: 'purple' },
  business: { title: 'Business Inquiry', icon: Briefcase, color: 'emerald' },
}

interface FormState {
  name: string
  email: string
  // Booking fields
  eventType: string
  date: string
  location: string
  budgetRange: string
  // Collab fields
  artistProjectName: string
  collabType: string
  workLink: string
  // Business fields
  company: string
  inquiryType: string
  // Shared
  message: string
}

const initialFormState: FormState = {
  name: '', email: '',
  eventType: '', date: '', location: '', budgetRange: '',
  artistProjectName: '', collabType: '', workLink: '',
  company: '', inquiryType: '',
  message: '',
}

export function ManagerContactForm({ type, profileId, artistName, onClose }: ManagerContactFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { title, icon: Icon, color } = FORM_CONFIG[type]

  const update = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      // Deliver the inquiry to the pro for real: persists to their inbox, lights
      // their bell, and fires a Pulse push so they get it on the go. visitorLang
      // travels along so the pro sees what language the booker is reaching out in.
      const res = await fetch('/api/manager/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          type,
          name: form.name,
          email: form.email,
          message: form.message,
          visitorLang: typeof navigator !== 'undefined' ? navigator.language : '',
          fields: {
            eventType: form.eventType,
            date: form.date,
            location: form.location,
            budgetRange: form.budgetRange,
            artistProjectName: form.artistProjectName,
            collabType: form.collabType,
            workLink: form.workLink,
            company: form.company,
            inquiryType: form.inquiryType,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any))
        throw new Error(data?.error || 'Could not send your inquiry.')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err?.message || 'Could not send your inquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="backdrop-blur-xl bg-black/80 border border-cyan-500/20 rounded-2xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Inquiry Submitted</h3>
        <p className="text-gray-400 text-sm mb-4">
          Your {type === 'booking' ? 'booking request' : type === 'collab' ? 'collaboration proposal' : 'business inquiry'} has been submitted. {artistName} will be in touch.
        </p>
        <button
          onClick={onClose}
          className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
        >
          Close
        </button>
      </div>
    )
  }

  const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none transition-colors placeholder:text-gray-500'
  const selectCls = `${inputCls} appearance-none`
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1'

  return (
    <div className="backdrop-blur-xl bg-black/80 border border-cyan-500/20 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}-400`} />
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm transition-colors">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Shared: Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Your name"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="you@email.com"
              className={inputCls}
              required
            />
          </div>
        </div>

        {/* Booking-specific fields */}
        {type === 'booking' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Event Type</label>
                <select value={form.eventType} onChange={e => update('eventType', e.target.value)} className={selectCls}>
                  <option value="">Select type...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => update('location', e.target.value)}
                  placeholder="City, venue"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Budget Range</label>
                <select value={form.budgetRange} onChange={e => update('budgetRange', e.target.value)} className={selectCls}>
                  <option value="">Select range...</option>
                  {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Collab-specific fields */}
        {type === 'collab' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Your Artist/Project Name</label>
                <input
                  type="text"
                  value={form.artistProjectName}
                  onChange={e => update('artistProjectName', e.target.value)}
                  placeholder="Your artist name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Collab Type</label>
                <select value={form.collabType} onChange={e => update('collabType', e.target.value)} className={selectCls}>
                  <option value="">Select type...</option>
                  {COLLAB_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Link to Your Work</label>
              <input
                type="url"
                value={form.workLink}
                onChange={e => update('workLink', e.target.value)}
                placeholder="https://soundcloud.com/you"
                className={inputCls}
              />
            </div>
          </>
        )}

        {/* Business-specific fields */}
        {type === 'business' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Company</label>
              <input
                type="text"
                value={form.company}
                onChange={e => update('company', e.target.value)}
                placeholder="Company name"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Inquiry Type</label>
              <select value={form.inquiryType} onChange={e => update('inquiryType', e.target.value)} className={selectCls}>
                <option value="">Select type...</option>
                {INQUIRY_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Message (all types) */}
        <div>
          <label className={labelCls}>Message</label>
          <textarea
            value={form.message}
            onChange={e => update('message', e.target.value)}
            placeholder="Tell us more about your inquiry..."
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4" /> Submit Inquiry</>
          )}
        </button>
      </form>
    </div>
  )
}
