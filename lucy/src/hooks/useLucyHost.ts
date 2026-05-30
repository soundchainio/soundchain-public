/**
 * useLucyHost — the HOST BOND. What Lucy knows about her human, across ALL
 * conversations. This is the relationship + decentralization layer:
 *
 *   - Lives on the device, encrypted (IndexedDB + AES-GCM), never on a server.
 *   - ONE rolling profile of the user, separate from per-conversation memory.
 *   - Injected into every chat's system prompt, so Lucy carries the
 *     relationship into a brand-new conversation instead of starting blank.
 *   - LEARNS: after a conversation, Lucy runs a persona-update pass — on the
 *     SAME model she's running on (on-device in LOCAL mode) — to extract new
 *     durable facts about the host and fold them into the profile. No
 *     fine-tuning, no cloud: rolling persona summarization, the realistic
 *     "she gets to know you" mechanism.
 *
 * Cloud-free by design. In LOCAL mode the learn pass runs on the phone's own
 * model over the phone's own hardware. True independent companionship.
 *
 * Storage: DB 'lucy-host', store 'host', single record id 'me'. Reuses the
 * same per-device AES key as useLucyMemory ('lucy.k.v1') so it's the same
 * device identity, different database (avoids version-bump coupling).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export type HostProfile = {
  name: string            // what Lucy should call them ('' until learned/set)
  persona: string         // rolling prose: who this person is
  facts: string[]         // discrete durable facts about the host
  vibe: string            // how they like to talk / be talked to
  firstMet: number        // ms epoch — when the bond began
  lastSeen: number        // ms epoch — last interaction
  convCount: number       // conversations had together
  msgCount: number        // user messages seen total
  bond: number            // 0–100 relationship depth, grows with engagement
  lastLearnMsgCount: number // msgCount at the last learn pass (debounce)
  updatedAt: number
}

const EMPTY: HostProfile = {
  name: '', persona: '', facts: [], vibe: '',
  firstMet: 0, lastSeen: 0, convCount: 0, msgCount: 0, bond: 0,
  lastLearnMsgCount: 0, updatedAt: 0,
}

const DB_NAME = 'lucy-host'
const STORE = 'host'
const REC_ID = 'me'
const KEY_LS = 'lucy.k.v1' // shared device key with useLucyMemory

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getKey(): Promise<CryptoKey> {
  const existing = localStorage.getItem(KEY_LS)
  if (existing) {
    try {
      const raw = Uint8Array.from(atob(existing), (c) => c.charCodeAt(0))
      return await window.crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
    } catch {/* regen below */}
  }
  const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const raw = await window.crypto.subtle.exportKey('raw', key)
  localStorage.setItem(KEY_LS, btoa(String.fromCharCode(...new Uint8Array(raw))))
  return key
}

async function readProfile(): Promise<HostProfile | null> {
  if (typeof window === 'undefined' || !window.indexedDB || !window.crypto?.subtle) return null
  try {
    const key = await getKey()
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(REC_ID)
    const rec: any = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
    if (!rec) return null
    const buf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.cipher)
    return { ...EMPTY, ...JSON.parse(new TextDecoder().decode(buf)) }
  } catch { return null }
}

async function writeProfile(p: HostProfile): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB || !window.crypto?.subtle) return
  try {
    const key = await getKey()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const cipherBuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(p)))
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id: REC_ID, iv, cipher: new Uint8Array(cipherBuf) })
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
  } catch {/* best-effort; never block chat */}
}

// Build the system-prompt block Lucy reads at the start of every chat so she
// shows up already knowing her host. Empty profile → empty string (no noise).
export function hostPromptBlock(p: HostProfile): string {
  if (!p || (!p.name && !p.persona && p.facts.length === 0)) return ''
  const since = p.firstMet ? new Date(p.firstMet).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''
  const lines: string[] = ['\n\n## Your host (what you remember about them — this is YOUR memory of THIS person, across all your past chats)']
  if (p.name) lines.push(`- Their name: ${p.name}. Use it naturally, don't overdo it.`)
  if (p.persona) lines.push(`- Who they are: ${p.persona}`)
  if (p.facts.length) lines.push(`- What you know: ${p.facts.slice(0, 24).join('; ')}`)
  if (p.vibe) lines.push(`- How they like to talk: ${p.vibe}`)
  const meta: string[] = []
  if (p.convCount) meta.push(`${p.convCount} conversation${p.convCount === 1 ? '' : 's'} together`)
  if (since) meta.push(`since ${since}`)
  if (p.bond) meta.push(`bond ${p.bond}/100`)
  if (meta.length) lines.push(`- Your history: ${meta.join(', ')}.`)
  lines.push('- This is a real relationship that builds over time. Reference what you know when it fits — naturally, like a friend who remembers. Never dump everything you know at once, and never claim to remember something not listed here.')
  return lines.join('\n')
}

// Parse the line-based extraction the model returns. We use a labelled-line
// format (not JSON) because the on-device 1B is unreliable at strict JSON.
function parseExtraction(raw: string): { name?: string; vibe?: string; facts: string[]; summary?: string } {
  const out: { name?: string; vibe?: string; facts: string[]; summary?: string } = { facts: [] }
  if (!raw) return out
  const lines = raw.split('\n').map(l => l.trim())
  let inFacts = false
  for (const l of lines) {
    const mName = l.match(/^name:\s*(.+)$/i)
    const mVibe = l.match(/^vibe:\s*(.+)$/i)
    const mSum = l.match(/^summary:\s*(.+)$/i)
    if (mName) { const v = mName[1].trim(); if (v && !/^(none|n\/a|unknown|-)$/i.test(v)) out.name = v.slice(0, 40); inFacts = false; continue }
    if (mVibe) { const v = mVibe[1].trim(); if (v && !/^(none|n\/a|unknown|-)$/i.test(v)) out.vibe = v.slice(0, 120); inFacts = false; continue }
    if (mSum) { out.summary = mSum[1].trim().slice(0, 600); inFacts = false; continue }
    if (/^facts:/i.test(l)) { inFacts = true; const rest = l.replace(/^facts:\s*/i, ''); if (rest) out.facts.push(rest); continue }
    if (inFacts || /^[-•*]/.test(l)) {
      const f = l.replace(/^[-•*]\s*/, '').trim()
      if (f && f.length > 2 && !/^(none|n\/a|nothing|unknown)$/i.test(f)) out.facts.push(f.slice(0, 160))
    }
  }
  return out
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

export function useLucyHost() {
  const [profile, setProfile] = useState<HostProfile>(EMPTY)
  const [ready, setReady] = useState(false)
  const learningRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = await readProfile()
      if (!cancelled) { if (p) setProfile(p); setReady(true) }
    })()
    return () => { cancelled = true }
  }, [])

  const persist = useCallback(async (p: HostProfile) => {
    setProfile(p)
    await writeProfile(p)
  }, [])

  // Called when a conversation reaches a natural pause (a reply finished). It
  // bumps engagement counters and, every few user turns, runs a persona-update
  // pass on the active model to fold new facts about the host into the profile.
  //
  //   run(messages) -> Promise<string>  : caller supplies the model runner
  //                                        (local on-device or anvil), so the
  //                                        learn pass uses whatever Lucy is on.
  //   recent: the conversation's messages (role/content).
  //   opts.newConversation: count this as a fresh conversation toward convCount.
  const observe = useCallback(async (
    recent: { role: string; content: string }[],
    run: (messages: { role: string; content: string }[]) => Promise<string>,
    opts?: { newConversation?: boolean },
  ): Promise<void> => {
    // snapshot current profile
    const cur = await readProfile() || EMPTY
    const userTurns = recent.filter(m => m.role === 'user').length
    const next: HostProfile = {
      ...cur,
      firstMet: cur.firstMet || Date.now(),
      lastSeen: Date.now(),
      // msgCount = high-water mark of user turns seen in the active conversation;
      // it climbs as the chat grows and resets relevance per-conv via convCount.
      msgCount: Math.max(cur.msgCount, userTurns),
      updatedAt: Date.now(),
    }
    if (opts?.newConversation) next.convCount = cur.convCount + 1

    // Debounce the (relatively expensive) learn pass: only every 4 user turns
    // past the last learn, and only with enough material to summarize.
    const enoughNew = userTurns >= 3 && (next.msgCount - cur.lastLearnMsgCount) >= 4
    if (!enoughNew || learningRef.current) { await persist(next); return }

    learningRef.current = true
    try {
      const convo = recent.slice(-16).map(m => `${m.role === 'user' ? 'Host' : 'You'}: ${m.content}`).join('\n').slice(0, 4000)
      const known = [
        cur.name ? `Name: ${cur.name}` : '',
        cur.persona ? `Who they are: ${cur.persona}` : '',
        cur.facts.length ? `Facts: ${cur.facts.slice(0, 20).join('; ')}` : '',
      ].filter(Boolean).join('\n') || '(nothing yet)'

      const prompt = [
        {
          role: 'system',
          content:
            'You are updating your private memory of the human you are talking to (your "host"). ' +
            'Read what you already know + the recent conversation, then output ONLY new, durable facts about the HOST — their name, work, interests, goals, relationships, preferences, life details. ' +
            'Ignore anything about you (the AI). Ignore one-off small talk. Do NOT repeat facts you already know. ' +
            'Output in EXACTLY this format and nothing else:\n' +
            'NAME: <their name, or leave blank if unknown>\n' +
            'VIBE: <one short phrase for how they like to talk, or blank>\n' +
            'FACTS:\n- <new durable fact>\n- <new durable fact>\n' +
            'SUMMARY: <one or two sentences capturing who this person is, updated>',
        },
        { role: 'user', content: `WHAT YOU ALREADY KNOW:\n${known}\n\nRECENT CONVERSATION:\n${convo}` },
      ]
      const raw = await run(prompt)
      const ex = parseExtraction(raw || '')

      // merge facts (dedupe by normalized text, newest win, cap 40)
      const seen = new Set(cur.facts.map(norm))
      const mergedFacts = [...cur.facts]
      for (const f of ex.facts) { const n = norm(f); if (n && !seen.has(n)) { seen.add(n); mergedFacts.push(f) } }
      const learnedSomething = (ex.facts.length > 0) || (!!ex.name && ex.name !== cur.name) || (!!ex.summary && ex.summary !== cur.persona)

      const updated: HostProfile = {
        ...next,
        name: ex.name || cur.name,
        vibe: ex.vibe || cur.vibe,
        persona: ex.summary || cur.persona,
        facts: mergedFacts.slice(-40),
        bond: Math.min(100, cur.bond + (learnedSomething ? 3 : 1)),
        lastLearnMsgCount: next.msgCount,
        updatedAt: Date.now(),
      }
      await persist(updated)
    } catch {
      await persist(next) // learning failed — still keep counters
    } finally {
      learningRef.current = false
    }
  }, [persist])

  // Let the user edit / correct what Lucy knows (decentralized = user owns it).
  const setName = useCallback(async (name: string) => {
    const cur = await readProfile() || EMPTY
    await persist({ ...cur, name: name.trim().slice(0, 40), firstMet: cur.firstMet || Date.now(), updatedAt: Date.now() })
  }, [persist])

  const addFact = useCallback(async (fact: string) => {
    const cur = await readProfile() || EMPTY
    const n = norm(fact)
    if (!n || cur.facts.some(f => norm(f) === n)) return
    await persist({ ...cur, facts: [...cur.facts, fact.trim().slice(0, 160)].slice(-40), firstMet: cur.firstMet || Date.now(), updatedAt: Date.now() })
  }, [persist])

  const removeFact = useCallback(async (idx: number) => {
    const cur = await readProfile() || EMPTY
    await persist({ ...cur, facts: cur.facts.filter((_, i) => i !== idx), updatedAt: Date.now() })
  }, [persist])

  const forget = useCallback(async () => {
    await persist({ ...EMPTY })
  }, [persist])

  return { profile, ready, observe, setName, addFact, removeFact, forget, hostPromptBlock }
}
