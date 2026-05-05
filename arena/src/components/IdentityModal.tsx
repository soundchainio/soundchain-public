/**
 * IdentityModal — arena's native-first sign-in gate.
 *
 * Replaces HandlePickerModal as the FIRST thing a user sees when they tap
 * a composer pill without an established identity. After sign-in (or "Continue
 * as Guest"), the HandlePickerModal still handles display handle/avatar — this
 * just establishes WHO the user is across devices.
 *
 * Per `feedback_arena_identity_separate_from_sc.md` + `feedback_arena_native_ready_from_day_one.md`:
 *   - No SoundChain login cross-use, no Magic SDK
 *   - Sign in with Apple = primary (App Store requirement on iOS)
 *   - Sign in with Google = secondary (Android primary, web cross-platform)
 *   - Continue as Guest = today's deviceId pseudonymous flow (free-to-play vibe)
 *   - All four translate to Capacitor plugins one-for-one for the native port
 *
 * Provider buttons gracefully disable + show a helper note when env vars
 * haven't been provisioned yet (caller fetches /api/auth/me to learn which
 * providers are live and passes `providers` prop). Continue as Guest always works.
 */

import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { getDeviceId } from '@/lib/identity'

interface ProviderConfig {
  apple: boolean
  google: boolean
  sessionReady: boolean
}

interface Props {
  providers: ProviderConfig
  onAuthSuccess: (params: { provider: 'apple' | 'google'; handle: string | null; avatar: string | null }) => void
  onContinueAsGuest: () => void
  onClose: () => void
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void
        signIn: () => Promise<{ authorization: { id_token: string; code: string; state?: string } }>
      }
    }
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: 'popup' | 'redirect'; auto_select?: boolean }) => void
          renderButton: (element: HTMLElement, config: { theme?: 'outline' | 'filled_blue' | 'filled_black'; size?: 'large' | 'medium' | 'small'; text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'; shape?: 'rectangular' | 'pill' | 'circle' | 'square'; logo_alignment?: 'left' | 'center'; width?: string }) => void
          prompt: () => void
        }
      }
    }
  }
}

const APPLE_CLIENT_ID_PUBLIC = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || ''
const GOOGLE_CLIENT_ID_PUBLIC = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export function IdentityModal({ providers, onAuthSuccess, onContinueAsGuest, onClose }: Props) {
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Apple JS SDK loader.
  useEffect(() => {
    if (!providers.apple || !APPLE_CLIENT_ID_PUBLIC) return
    if (window.AppleID) return
    const script = document.createElement('script')
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
    script.async = true
    script.onload = () => {
      window.AppleID?.auth.init({
        clientId: APPLE_CLIENT_ID_PUBLIC,
        scope: 'name email',
        redirectURI: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/apple/callback` : '',
        usePopup: true,
      })
    }
    document.head.appendChild(script)
  }, [providers.apple])

  // Google Identity Services SDK loader.
  useEffect(() => {
    if (!providers.google || !GOOGLE_CLIENT_ID_PUBLIC) return
    if (window.google?.accounts?.id) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID_PUBLIC,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
      })
      // Render the official GIS button into our container — keeps Google's
      // brand guidelines (required by their TOS) without us forging the chrome.
      if (googleBtnRef.current) {
        window.google?.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '320',
        })
      }
    }
    document.head.appendChild(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers.google])

  const handleAppleClick = async () => {
    if (!window.AppleID) {
      setErr('Apple sign-in is still loading…')
      return
    }
    setBusy('apple')
    setErr(null)
    try {
      const result = await window.AppleID.auth.signIn()
      const idToken = result?.authorization?.id_token
      if (!idToken) throw new Error('Apple did not return an id_token')
      const r = await fetch('/api/auth/apple/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, deviceId: getDeviceId() }),
      })
      const payload = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(payload?.error || `Apple sign-in failed (${r.status})`)
      onAuthSuccess({ provider: 'apple', handle: payload.handle ?? null, avatar: payload.avatar ?? null })
    } catch (e: unknown) {
      const msg = (e as Error)?.message || 'Apple sign-in failed'
      // Suppress benign user-cancelled popups.
      if (!/cancel|popup_closed_by_user|user.?cancelled/i.test(msg)) setErr(msg)
    } finally {
      setBusy(null)
    }
  }

  const handleGoogleCredential = async (response: { credential: string }) => {
    if (!response?.credential) return
    setBusy('google')
    setErr(null)
    try {
      const r = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential, deviceId: getDeviceId() }),
      })
      const payload = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(payload?.error || `Google sign-in failed (${r.status})`)
      onAuthSuccess({ provider: 'google', handle: payload.handle ?? null, avatar: payload.avatar ?? null })
    } catch (e: unknown) {
      setErr((e as Error)?.message || 'Google sign-in failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-arena-paper dark:bg-arena-carbon border-t sm:border border-arena-border-l dark:border-arena-border-d sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-arena-border-l dark:border-arena-border-d flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Sign in to drop takes</h2>
            <p className="text-[11px] text-arena-muted-l dark:text-arena-muted-d mt-0.5">
              Your handle follows you across devices
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d flex items-center justify-center hover:border-arena-red hover:text-arena-red transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-4 py-5 flex flex-col gap-3">
          {/* Sign in with Apple */}
          <button
            type="button"
            onClick={handleAppleClick}
            disabled={!providers.apple || busy !== null}
            className="w-full h-11 rounded-lg bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Sign in with Apple"
          >
            {busy === 'apple' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            <span>Sign in with Apple</span>
          </button>

          {/* Sign in with Google — official GIS button is rendered into this container */}
          {providers.google && GOOGLE_CLIENT_ID_PUBLIC ? (
            <div ref={googleBtnRef} className="w-full flex justify-center" aria-label="Sign in with Google" />
          ) : (
            <button
              type="button"
              disabled
              className="w-full h-11 rounded-lg bg-white text-zinc-900 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Sign in with Google (coming soon)"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-arena-border-l dark:bg-arena-border-d" />
            <span className="text-[10px] text-arena-muted-l dark:text-arena-muted-d uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-arena-border-l dark:bg-arena-border-d" />
          </div>

          {/* Continue as Guest — today's deviceId-only flow */}
          <button
            type="button"
            onClick={onContinueAsGuest}
            disabled={busy !== null}
            className="w-full h-11 rounded-lg bg-arena-card dark:bg-arena-surface border border-arena-border-l dark:border-arena-border-d text-sm font-semibold hover:border-arena-red hover:text-arena-red transition disabled:opacity-40"
          >
            Continue as Guest
          </button>

          {err && (
            <div className="text-[11px] text-arena-red font-bold mt-1">
              {err}
            </div>
          )}

          <p className="text-[10px] text-arena-muted-l dark:text-arena-muted-d text-center mt-2 leading-snug">
            Apple/Google sign-in lets your handle survive history wipes + new devices.
            Guest mode keeps you device-only — clear cookies and the handle's gone.
          </p>
        </div>
      </div>
    </div>
  )
}
