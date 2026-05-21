/**
 * useLucyMemory — Phase 8 of the Lucy stack.
 *
 * Local-first encrypted memory for Lucy conversations. Lives entirely in
 * the user's browser via IndexedDB; never touches a server. Frank wanted
 * memory decentralized — this is that.
 *
 * Storage shape: one record per conversation, encrypted with AES-GCM.
 * The encryption key is per-device (stored in localStorage; will move
 * to passkey-bound key derivation in a later phase). The encryption is
 * primarily to prevent shoulder-surfing access to a stored chat — not
 * to protect against a determined attacker with the device.
 *
 *   Key generation:
 *     - On first use: window.crypto.subtle.generateKey('AES-GCM', 256)
 *     - Export raw bytes, store in localStorage as 'lucy.k.v1'
 *     - On subsequent loads: import the stored key
 *
 *   Record shape (IndexedDB store 'conversations'):
 *     {
 *       id: string,         // 'default' for the single rolling chat
 *       iv: Uint8Array,     // AES-GCM IV (random per write)
 *       cipher: Uint8Array, // encrypted JSON payload
 *       updatedAt: number,  // ms epoch
 *     }
 *
 *   Plaintext payload (after decrypt):
 *     {
 *       messages: ChatMessage[],
 *       lastSeen: number,
 *     }
 *
 * Public API:
 *   const { messages, save, clear, ready } = useLucyMemory()
 *   - messages: ChatMessage[] (auto-loaded on mount; defaults to [])
 *   - save(messages): Promise<void> — re-encrypts + persists
 *   - clear(): Promise<void> — wipes the conversation
 *   - ready: boolean — true once initial load completes
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const DB_NAME = 'lucy-memory'
const STORE = 'conversations'
const KEY_LS = 'lucy.k.v1'
const DEFAULT_CONV_ID = 'default'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = typeof window !== 'undefined' ? localStorage.getItem(KEY_LS) : null
  if (existing) {
    try {
      const raw = Uint8Array.from(atob(existing), (c) => c.charCodeAt(0))
      return await window.crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      )
    } catch {
      // Fall through to regen if stored key is corrupt
    }
  }
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const raw = await window.crypto.subtle.exportKey('raw', key)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)))
  localStorage.setItem(KEY_LS, b64)
  return key
}

async function encryptJson(key: CryptoKey, obj: unknown): Promise<{ iv: Uint8Array; cipher: Uint8Array }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(obj))
  const cipherBuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { iv, cipher: new Uint8Array(cipherBuf) }
}

async function decryptJson<T = unknown>(key: CryptoKey, iv: Uint8Array, cipher: Uint8Array): Promise<T> {
  const plainBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T
}

export function useLucyMemory(conversationId: string = DEFAULT_CONV_ID) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [ready, setReady] = useState(false)
  const keyRef = useRef<CryptoKey | null>(null)

  // Initial load
  useEffect(() => {
    if (typeof window === 'undefined' || !window.crypto?.subtle || !window.indexedDB) {
      // Bail silently — memory just disabled on unsupported environments
      setReady(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const key = await getOrCreateKey()
        if (cancelled) return
        keyRef.current = key
        const db = await openDb()
        const tx = db.transaction(STORE, 'readonly')
        const store = tx.objectStore(STORE)
        const req = store.get(conversationId)
        await new Promise<void>((res, rej) => {
          req.onsuccess = () => res()
          req.onerror = () => rej(req.error)
        })
        const rec = req.result as { iv: Uint8Array; cipher: Uint8Array } | undefined
        if (rec) {
          const payload = await decryptJson<{ messages: ChatMessage[] }>(key, rec.iv, rec.cipher)
          if (!cancelled && Array.isArray(payload.messages)) {
            setMessages(payload.messages)
          }
        }
      } catch (err) {
        // Decrypt failures (wrong key, corruption) -> start fresh.
        // eslint-disable-next-line no-console
        console.warn('[useLucyMemory] failed to load — starting fresh:', err)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [conversationId])

  const save = useCallback(async (next: ChatMessage[]) => {
    if (!keyRef.current) return
    if (typeof window === 'undefined' || !window.indexedDB) return
    try {
      const { iv, cipher } = await encryptJson(keyRef.current, {
        messages: next,
        lastSeen: Date.now(),
      })
      const db = await openDb()
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ id: conversationId, iv, cipher, updatedAt: Date.now() })
      await new Promise<void>((res, rej) => {
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[useLucyMemory] save failed:', err)
    }
  }, [conversationId])

  const clear = useCallback(async () => {
    setMessages([])
    if (typeof window === 'undefined' || !window.indexedDB) return
    try {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(conversationId)
      await new Promise<void>((res, rej) => {
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    } catch {
      // ignore
    }
  }, [conversationId])

  return { messages, setMessages, save, clear, ready }
}
