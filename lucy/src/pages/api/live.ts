/**
 * /api/live?q=... — Lucy's real-time data senses.
 *
 * The "Ultron scan" layer: gives Lucy live, factual data from the open web
 * without an API key or a paid plan. She emits `[live: <question>]` in a reply;
 * this route CLASSIFIES the question server-side and fetches the real number /
 * fact, then returns a crisp one-liner the client splices into her message.
 *
 * Keeping the smarts on the server means the on-device / 8B model only has to
 * ASK — it never has to know endpoints, parse JSON, or hold an API key.
 *
 * Sources — all FREE + KEY-LESS (verified working from a server IP):
 *   crypto   → CoinGecko simple price (fallback: Coinbase spot)
 *   weather  → Open-Meteo forecast + Open-Meteo geocoder (city → lat/lon/tz)
 *   time     → Open-Meteo geocoder timezone + Intl.DateTimeFormat
 *   recipe   → TheMealDB (public test key "1")
 *   stock    → Yahoo Finance chart (unofficial; best-effort)
 *
 * Returns: { ok, kind, answer, source } | { ok:false, kind:'none', answer }
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const T = 7000 // per-upstream timeout (ms)

const j = async (url: string, headers?: Record<string, string>): Promise<any> => {
  const r = await fetch(url, {
    headers: { 'user-agent': 'lucy.soundchain.io/1.0 (+live data)', accept: 'application/json', ...(headers || {}) },
    signal: AbortSignal.timeout(T),
  })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

const fmtUsd = (n: number): string =>
  n >= 1 ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
         : `$${n.toLocaleString('en-US', { maximumFractionDigits: 8 })}`

// ── Crypto ────────────────────────────────────────────────────────────────
// Common names + tickers → CoinGecko ids. Extend freely.
const COIN_IDS: Record<string, string> = {
  btc: 'bitcoin', bitcoin: 'bitcoin', xbt: 'bitcoin',
  eth: 'ethereum', ethereum: 'ethereum', ether: 'ethereum',
  sol: 'solana', solana: 'solana',
  doge: 'dogecoin', dogecoin: 'dogecoin',
  ada: 'cardano', cardano: 'cardano',
  xrp: 'ripple', ripple: 'ripple',
  bnb: 'binancecoin', matic: 'matic-network', polygon: 'matic-network',
  ltc: 'litecoin', litecoin: 'litecoin',
  link: 'chainlink', chainlink: 'chainlink',
  avax: 'avalanche-2', avalanche: 'avalanche-2',
  dot: 'polkadot', polkadot: 'polkadot',
  shib: 'shiba-inu', pol: 'matic-network',
  ogun: 'ogun', // best-effort; CoinGecko may not list it → falls through
}

const cryptoLookup = async (q: string): Promise<{ answer: string; source: string } | null> => {
  const lc = q.toLowerCase()
  // find which coin(s) are mentioned
  const ids: string[] = []
  const labels: string[] = []
  for (const key of Object.keys(COIN_IDS)) {
    const re = new RegExp(`\\b${key}\\b`, 'i')
    if (re.test(lc) && !ids.includes(COIN_IDS[key])) {
      ids.push(COIN_IDS[key]); labels.push(key)
    }
  }
  if (ids.length === 0) ids.push('bitcoin') // "what's the price" with no coin → BTC
  try {
    const d = await j(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`)
    const parts: string[] = []
    for (const id of ids) {
      const row = d[id]
      if (row?.usd != null) {
        const chg = row.usd_24h_change
        const arrow = chg == null ? '' : chg >= 0 ? ` (▲${chg.toFixed(1)}% 24h)` : ` (▼${Math.abs(chg).toFixed(1)}% 24h)`
        parts.push(`${id.replace(/-/g, ' ')} ${fmtUsd(row.usd)}${arrow}`)
      }
    }
    if (parts.length) return { answer: parts.join(' · '), source: 'CoinGecko' }
  } catch {}
  // Fallback: Coinbase spot for the first coin (BTC/ETH style)
  try {
    const sym = (labels[0] || 'btc').toUpperCase().replace('BITCOIN', 'BTC').replace('ETHEREUM', 'ETH')
    const d = await j(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`)
    if (d?.data?.amount) return { answer: `${sym} ${fmtUsd(parseFloat(d.data.amount))}`, source: 'Coinbase' }
  } catch {}
  return null
}

// ── Weather + Time share the geocoder ───────────────────────────────────────
const geocode = async (place: string): Promise<{ name: string; lat: number; lon: number; tz: string; country: string } | null> => {
  try {
    const d = await j(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`)
    const r = d?.results?.[0]
    if (!r) return null
    return { name: r.name, lat: r.latitude, lon: r.longitude, tz: r.timezone, country: r.country || '' }
  } catch { return null }
}

const WMO: Record<number, string> = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'rain showers', 81: 'rain showers', 82: 'violent rain showers',
  85: 'snow showers', 86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm w/ hail', 99: 'severe thunderstorm',
}

// strip lead words so "weather in tokyo" / "time in new york" → "tokyo" / "new york"
const placeFrom = (q: string): string =>
  q.replace(/.*\b(?:in|at|for|of)\b/i, '')
   .replace(/\b(weather|forecast|temperature|temp|time|clock|hour|right now|now|today|currently|the)\b/gi, '')
   .replace(/[?.!]/g, '').trim() || q.replace(/[?.!]/g, '').trim()

const weatherLookup = async (q: string): Promise<{ answer: string; source: string } | null> => {
  const g = await geocode(placeFrom(q))
  if (!g) return null
  try {
    const d = await j(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`)
    const c = d?.current
    if (!c) return null
    const cond = WMO[c.weather_code] ?? 'unknown conditions'
    const cF = Math.round(c.temperature_2m * 9 / 5 + 32)
    const feelsF = Math.round(c.apparent_temperature * 9 / 5 + 32)
    const where = g.country ? `${g.name}, ${g.country}` : g.name
    return {
      answer: `${where}: ${cond}, ${Math.round(c.temperature_2m)}°C / ${cF}°F (feels ${feelsF}°F), wind ${Math.round(c.wind_speed_10m)} km/h, humidity ${c.relative_humidity_2m}%`,
      source: 'Open-Meteo',
    }
  } catch { return null }
}

const timeLookup = async (q: string): Promise<{ answer: string; source: string } | null> => {
  const place = placeFrom(q)
  const g = place ? await geocode(place) : null
  const tz = g?.tz || 'UTC'
  try {
    const now = new Date()
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    })
    const where = g ? (g.country ? `${g.name}, ${g.country}` : g.name) : 'UTC'
    return { answer: `${where}: ${fmt.format(now)}`, source: 'system clock' }
  } catch { return null }
}

// ── Recipe ──────────────────────────────────────────────────────────────────
const recipeLookup = async (q: string): Promise<{ answer: string; source: string } | null> => {
  const dish = q.replace(/.*\b(?:recipe for|recipe|how (?:do i|to) (?:make|cook)|make|cook)\b/i, '')
                .replace(/[?.!]/g, '').trim() || q.replace(/[?.!]/g, '').trim()
  try {
    const d = await j(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(dish)}`)
    const m = d?.meals?.[0]
    if (!m) return null
    const ing: string[] = []
    for (let i = 1; i <= 20; i++) {
      const name = m[`strIngredient${i}`]; const amt = m[`strMeasure${i}`]
      if (name && name.trim()) ing.push(`${(amt || '').trim()} ${name.trim()}`.trim())
    }
    const steps = (m.strInstructions || '').replace(/\r/g, '').split('\n').filter((s: string) => s.trim()).slice(0, 6)
    const answer =
      `**${m.strMeal}** (${m.strArea || 'world'} · ${m.strCategory || 'dish'})\n` +
      `Ingredients: ${ing.slice(0, 14).join(', ')}\n` +
      `Steps: ${steps.join(' ')}`.slice(0, 900)
    return { answer, source: 'TheMealDB' }
  } catch { return null }
}

// ── Stock (best-effort, unofficial) ──────────────────────────────────────────
const stockLookup = async (q: string): Promise<{ answer: string; source: string } | null> => {
  // grab an UPPERCASE ticker, or a word after "stock"/"price of"
  const m = q.match(/\b([A-Z]{1,5})\b/) || q.match(/\b(?:stock|share|price of|ticker)\s+([a-z]{1,5})\b/i)
  const sym = (m?.[1] || '').toUpperCase()
  if (!sym) return null
  try {
    const d = await j(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`)
    const meta = d?.chart?.result?.[0]?.meta
    if (meta?.regularMarketPrice == null) return null
    const cur = meta.currency || 'USD'
    const prev = meta.chartPreviousClose ?? meta.previousClose
    const px = meta.regularMarketPrice
    let chg = ''
    if (prev) { const p = ((px - prev) / prev) * 100; chg = p >= 0 ? ` (▲${p.toFixed(1)}%)` : ` (▼${Math.abs(p).toFixed(1)}%)` }
    return { answer: `${sym}: ${px.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${cur}${chg}`, source: 'Yahoo Finance' }
  } catch { return null }
}

type Kind = 'crypto' | 'weather' | 'time' | 'recipe' | 'stock'

const classify = (q: string): Kind => {
  const s = q.toLowerCase()
  if (/\b(recipe|cook|cooking|how (?:do i|to) make|ingredient|bake|dish|meal)\b/.test(s)) return 'recipe'
  if (/\b(weather|forecast|temperature|temp|how (?:hot|cold)|raining|snowing|humidity)\b/.test(s)) return 'weather'
  if (/\b(time|clock|hour|what time)\b/.test(s)) return 'time'
  if (/\b(btc|eth|sol|doge|ada|xrp|bnb|matic|ltc|link|avax|dot|shib|bitcoin|ethereum|crypto|coin|token|satoshi)\b/.test(s)) return 'crypto'
  if (/\b(stock|share|shares|ticker|nasdaq|dow|s&p|aapl|tsla|nvda|msft|googl|amzn|meta)\b/.test(s)) return 'stock'
  // default: if a $ or "price" with no stock words → crypto, else weather is a poor default → crypto
  if (/\bprice\b|\$/.test(s)) return 'crypto'
  return 'crypto'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, kind: 'none', answer: 'GET only' })
  }
  const q = (req.query.q as string || '').trim()
  if (!q) return res.status(400).json({ ok: false, kind: 'none', answer: 'q (question) required' })

  const kind = classify(q)
  const fn = { crypto: cryptoLookup, weather: weatherLookup, time: timeLookup, recipe: recipeLookup, stock: stockLookup }[kind]

  try {
    const out = await fn(q)
    if (out) {
      // short live cache so rapid re-asks don't hammer upstreams; prices move
      // slowly enough that 30s is invisible to a human.
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')
      return res.status(200).json({ ok: true, kind, answer: out.answer, source: out.source })
    }
  } catch {}
  return res.status(200).json({ ok: false, kind, answer: `couldn't pull live ${kind} data for "${q}" right now` })
}
