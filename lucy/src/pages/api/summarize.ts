/**
 * /api/summarize?url=... — server-side link summarizer for Lucy.
 *
 * Fetches the URL, pulls Open Graph metadata + a body excerpt, returns a
 * structured summary Lucy can talk about. Works for IG / FB / X / TikTok
 * / news / blogs / YouTube — anything that ships OG tags in initial HTML
 * (which is most of the modern web for share-ability).
 *
 * Why server-side: most social sites block cross-origin client fetches; the
 * server has no CORS restriction.
 *
 * Returns:
 *   { url, title, description, image, siteName, body }
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const TIMEOUT_MS = 8000
const MAX_HTML_BYTES = 250_000  // 250 KB is plenty for OG tags + first paragraphs
const MAX_BODY_TEXT = 1500      // chars of stripped body excerpt

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 LucyBot/1.0 (+https://lucy.soundchain.io)'

const meta = (html: string, prop: string): string => {
  // <meta property="og:title" content="...">
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop.replace(/[-/.]/g, '\\$&')}["'][^>]*content=["']([^"']+)["']`, 'i')
  // <meta content="..." property="og:title">
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop.replace(/[-/.]/g, '\\$&')}["']`, 'i')
  return (html.match(re1) || html.match(re2) || [])[1] || ''
}

const decodeEntities = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
   .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCharCode(parseInt(n)) } catch { return _ } })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }
  const raw = (req.query.url as string || '').trim()
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return res.status(400).json({ error: 'url query param required (http/https)' })
  }
  // Light SSRF guard — block private + loopback hosts.
  let host = ''
  try { host = new URL(raw).hostname } catch { return res.status(400).json({ error: 'invalid url' }) }
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|localhost)/i.test(host)) {
    return res.status(400).json({ error: 'blocked host' })
  }

  try {
    const upstream = await fetch(raw, {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!upstream.ok) {
      return res.status(200).json({
        url: raw,
        title: '',
        description: `(upstream ${upstream.status})`,
        image: '',
        siteName: '',
        body: '',
        error: `upstream ${upstream.status}`,
      })
    }
    const reader = upstream.body?.getReader()
    let received = 0
    const chunks: Uint8Array[] = []
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.byteLength
          if (received >= MAX_HTML_BYTES) { reader.cancel(); break }
        }
      }
    }
    const html = new TextDecoder('utf-8').decode(
      chunks.reduce((acc, c) => { const out = new Uint8Array(acc.length + c.length); out.set(acc); out.set(c, acc.length); return out }, new Uint8Array(0))
    )

    const title = decodeEntities(meta(html, 'og:title') || (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '')
    const description = decodeEntities(meta(html, 'og:description') || meta(html, 'description') || '')
    const image = meta(html, 'og:image')
    const siteName = decodeEntities(meta(html, 'og:site_name'))
    const canonicalUrl = meta(html, 'og:url') || raw

    // Strip scripts/styles/tags → plain-text body excerpt (helps Lucy summarize
    // when OG description is missing or thin).
    const bodyText = decodeEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<!--([\s\S]*?)-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
    ).replace(/\s+/g, ' ').trim().slice(0, MAX_BODY_TEXT)

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json({
      url: canonicalUrl,
      title: title.trim(),
      description: description.trim(),
      image,
      siteName: siteName.trim(),
      body: bodyText,
    })
  } catch (err: any) {
    return res.status(200).json({
      url: raw,
      title: '',
      description: `(fetch failed: ${err?.message || 'unknown'})`,
      image: '',
      siteName: '',
      body: '',
      error: err?.message || 'fetch failed',
    })
  }
}
