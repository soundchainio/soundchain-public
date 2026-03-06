/**
 * usePulseEncryption — Nostr NIP-17 encryption layer for Pulse messages.
 *
 * Wraps the existing lib/nostr/privateDM.ts for transparent
 * encrypt-before-send / decrypt-on-receive in the Pulse UI.
 *
 * Toggle: user can enable/disable per-conversation (localStorage).
 * Uses NIP-44 (ChaCha20) + NIP-59 (Gift Wrap) for military-grade E2E.
 */

import { useCallback, useMemo } from 'react'
import {
  sendPrivateDM,
  decryptPrivateDM,
  type DecryptedDM,
} from 'lib/nostr/privateDM'
import type { Event } from 'nostr-tools'

const ENCRYPTION_KEY = 'pulse_encryption_enabled'

export function usePulseEncryption(myNostrPrivateKey: Uint8Array | null) {
  const isAvailable = !!myNostrPrivateKey

  const isEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(ENCRYPTION_KEY) !== 'false'
    } catch {
      return true
    }
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(ENCRYPTION_KEY, String(enabled))
    } catch {
      // ignore
    }
  }, [])

  const encryptMessage = useCallback(
    async (plaintext: string, recipientPubkey: string) => {
      if (!myNostrPrivateKey || !isEnabled) return null
      try {
        const wraps = await sendPrivateDM({
          senderPrivateKey: myNostrPrivateKey,
          recipientPubkey,
          message: plaintext,
        })
        return wraps
      } catch (err) {
        console.debug('[Pulse] Encryption failed, sending unencrypted:', err)
        return null
      }
    },
    [myNostrPrivateKey, isEnabled]
  )

  const decryptMessage = useCallback(
    (wrap: Event): DecryptedDM | null => {
      if (!myNostrPrivateKey) return null
      try {
        return decryptPrivateDM(wrap, myNostrPrivateKey)
      } catch {
        return null
      }
    },
    [myNostrPrivateKey]
  )

  return {
    isAvailable,
    isEnabled,
    setEnabled,
    encryptMessage,
    decryptMessage,
  }
}
