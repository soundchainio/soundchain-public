import { useState } from 'react'
import { Pencil, Check, Loader2 } from 'lucide-react'

// Owner-only inline bio editor, rendered above the Inbox. Saves Vercel-direct to
// /api/profile/update (the bio is what a promoter reads first under the name).
export function ManagerBioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio || '')
  const [saved, setSaved] = useState(initialBio || '')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const dirty = bio.trim() !== saved.trim()

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fields: { bio: bio.trim() } }),
      })
      if (res.ok) {
        setSaved(bio.trim())
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="lg:col-span-2 backdrop-blur-xl bg-black/60 border border-cyan-500/20 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Your bio</h2>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Tell promoters who you are…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 focus:border-cyan-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-gray-500">{bio.length}/280</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBio(saved)
                  setEditing(false)
                }}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-green-400 disabled:opacity-50 rounded-lg px-3 py-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-300 whitespace-pre-wrap">
          {saved || <span className="text-gray-500 italic">No bio yet — tap Edit to add one.</span>}
        </p>
      )}
    </section>
  )
}
