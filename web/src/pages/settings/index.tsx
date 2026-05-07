/**
 * /settings — Account Settings landing.
 *
 * Was a self-redirect stub (`destination: '/settings'`) that ghost-routed to
 * itself, infinite-loop'd the page, never let users edit anything. Frank
 * surfaced May 7 trying to test the new phone-number field shipped in the
 * Phase 2 native text-style DM ship (`5f6cf14`). Fixed by rendering the real
 * `NotificationSettingsForm` here directly — top-level route, no `/dex/*`
 * detour, no redirect chain.
 *
 * Phone number field lives in the form's prefilled `initialValues` —
 * sourced from `me.phoneNumber` via the `useMeQuery` hook. Hashed server-side
 * via `/api/identity/register-phone` (PHONE_HASH_PEPPER + sparse unique index
 * on User.phoneHash, plaintext optionally retained).
 */
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeft } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMeQuery } from 'lib/graphql'

const NotificationSettingsForm = dynamic(
  () => import('components/forms/NotificationSettingsForm').then((m) => m.NotificationSettingsForm),
  { ssr: false },
)

export default function SettingsPage() {
  const router = useRouter()
  const { data, loading, error } = useMeQuery()
  const me = data?.me

  return (
    <>
      <Head>
        <title>Account Settings · SoundChain</title>
        <meta name="description" content="Manage your SoundChain account — notifications, phone number, Nostr identity." />
      </Head>
      <main className="min-h-screen bg-black text-white antialiased">
        <header className="border-b border-white/10 sticky top-0 z-10 bg-black/80 backdrop-blur">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push('/nodes'))}
              className="flex items-center gap-1.5 text-[12px] font-bold text-white/70 hover:text-cyan-300 transition px-2 py-1 rounded-md hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-base font-black tracking-tight">Account Settings</h1>
            <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">
              v2
            </span>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {loading && (
            <div className="h-32 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse" />
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-300">
              Couldn&apos;t load your account: {error.message}
            </div>
          )}

          {!loading && !me && !error && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-sm text-white/70 mb-3">You need to be logged in to manage settings.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] bg-cyan-500 text-black hover:bg-cyan-400 transition"
              >
                Sign in
              </Link>
            </div>
          )}

          {me && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-4">
                <h2 className="text-sm font-black tracking-tight uppercase">Notifications + Phone</h2>
                <p className="text-[12px] text-white/50 mt-1">
                  Set your cell # for native text-style DMs (Phase 2). Hashed server-side w/ pepper — raw number never stored unless you opt in.
                </p>
              </div>
              <NotificationSettingsForm
                afterSubmit={() => router.push('/nodes')}
                initialValues={{
                  phoneNumber: me.phoneNumber,
                  notifyOnFollow: me.notifyOnFollow,
                  notifyOnLike: me.notifyOnLike,
                  notifyOnComment: me.notifyOnComment,
                  notifyOnSale: me.notifyOnSale,
                  notifyOnTip: me.notifyOnTip,
                  notifyOnDM: me.notifyOnDM,
                  nostrPubkey: me.nostrPubkey,
                  notifyViaNostr: me.notifyViaNostr,
                }}
              />
            </section>
          )}

          {me && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm font-black tracking-tight uppercase mb-3">More fields</h2>
              <p className="text-[12px] text-white/50 mb-3">
                These pages are getting wired into top-level routes next ship — for now they redirect here.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {[
                  ['Display name', '/settings/name'],
                  ['Username', '/settings/username'],
                  ['Bio', '/settings/bio'],
                  ['Profile picture', '/settings/profile-picture'],
                  ['Cover photo', '/settings/cover-picture'],
                  ['Genres', '/settings/favorite-genres'],
                  ['Musician type', '/settings/musician-type'],
                  ['Social links', '/settings/social-links'],
                  ['Security', '/settings/security'],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white/60 hover:border-cyan-400/40 hover:text-cyan-300 transition"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
