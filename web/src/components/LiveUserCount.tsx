import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'

export function LiveUserCount() {
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/agent/dashboard')
        const data = await res.json()
        if (mounted && data.success) {
          setTotal(data.dashboard.users.total)
        }
      } catch {}
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60_000) // refresh every minute

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (total === null) return null

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
      <Users className="w-3.5 h-3.5 text-cyan-400" />
      <span className="text-xs font-mono font-semibold text-cyan-300">
        {total.toLocaleString()}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </div>
  )
}
