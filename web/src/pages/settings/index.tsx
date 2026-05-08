/**
 * /settings — single-page Account Settings.
 *
 * One page, every editable field rendered inline as a collapsible section.
 * Frank May 7 directive: "all on the page so users can edit their settings
 * anytime" — no sub-routes, no redirects, no back-and-forth navigation.
 *
 * Each section is a `<details>` accordion (closed by default except the new
 * Phase 2 Notifications + Phone block which is the headline feature).
 * Click the header → expand → edit → save in place. Forms own their own
 * state + GraphQL submit; we just render them.
 *
 * Sections:
 *   1. Notifications + Phone (Phase 2 native text DM stack — open by default)
 *   2. Display Name
 *   3. Username (handle)
 *   4. Bio
 *   5. Profile Picture
 *   6. Cover Photo
 *   7. Favorite Genres
 *   8. Musician Type
 *   9. Social Links
 *   10. Security
 */
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useMeQuery } from 'lib/graphql'
import {
  ArrowLeft,
  ChevronDown,
  Bell,
  User,
  AtSign,
  FileText,
  Image as ImageIcon,
  Layers,
  Music,
  Mic,
  Link as LinkIcon,
  Shield,
} from 'lucide-react'

// All forms loaded client-only — they pull from Apollo + need the user session.
const NotificationSettingsForm = dynamic(
  () => import('components/forms/NotificationSettingsForm').then((m) => m.NotificationSettingsForm),
  { ssr: false },
)
const DisplayNameForm = dynamic(
  () => import('components/forms/profile/DisplayNameForm').then((m) => m.DisplayNameForm),
  { ssr: false },
)
const HandleForm = dynamic(
  () => import('components/forms/profile/HandleForm').then((m) => m.HandleForm),
  { ssr: false },
)
const BioForm = dynamic(
  () => import('components/forms/profile/BioForm').then((m) => m.BioForm),
  { ssr: false },
)
const ProfilePictureForm = dynamic(
  () => import('components/forms/profile/ProfilePictureForm').then((m) => m.ProfilePictureForm),
  { ssr: false },
)
const CoverPictureForm = dynamic(
  () => import('components/forms/profile/CoverPictureForm').then((m) => m.CoverPictureForm),
  { ssr: false },
)
const FavoriteGenresForm = dynamic(
  () => import('components/forms/profile/FavoriteGenresForm').then((m) => m.FavoriteGenresForm),
  { ssr: false },
)
const MusicianTypesForm = dynamic(
  () => import('components/forms/profile/MusicianTypesForm').then((m) => m.MusicianTypesForm),
  { ssr: false },
)
const SocialLinksForm = dynamic(
  () => import('components/forms/profile/SocialLinksForm').then((m) => m.SocialLinksForm),
  { ssr: false },
)
const SecurityForm = dynamic(
  () => import('components/forms/profile/SecurityForm').then((m) => m.SecurityForm),
  { ssr: false },
)

interface SectionProps {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ id, icon: Icon, title, subtitle, defaultOpen, children }: SectionProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group rounded-xl border border-white/10 bg-white/[0.02] open:border-cyan-400/30 open:bg-cyan-400/[0.03] transition"
    >
      <summary className="cursor-pointer list-none px-5 py-4 flex items-center gap-3 select-none">
        <Icon className="w-4 h-4 text-cyan-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-white/50 mt-0.5">{subtitle}</p>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180 flex-shrink-0" />
      </summary>
      <div className="px-5 pb-5 pt-2 border-t border-white/10">
        {children}
      </div>
    </details>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { data, loading, error } = useMeQuery()
  const me = data?.me

  const noop = () => {}

  return (
    <>
      <Head>
        <title>Account Settings · SoundChain</title>
        <meta name="description" content="Manage your SoundChain account — notifications, phone, display name, bio, profile picture, cover photo, genres, musician type, social links, security." />
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

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
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
            <>
              {/* Phase 2 — Notifications + Phone (open by default, headline feature) */}
              <Section
                id="notifications"
                icon={Bell}
                title="Notifications + Phone"
                subtitle="Cell # for native text-style DMs · push · Nostr · per-event preferences"
                defaultOpen
              >
                <NotificationSettingsForm
                  afterSubmit={noop}
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
              </Section>

              <Section id="display-name" icon={User} title="Display Name" subtitle="What others see on your posts and profile">
                <DisplayNameForm afterSubmit={noop} submitText="Save Name" />
              </Section>

              <Section id="username" icon={AtSign} title="Username" subtitle="Your @handle — used in URLs, mentions, share links">
                <HandleForm afterSubmit={noop} submitText="Save Username" />
              </Section>

              <Section id="bio" icon={FileText} title="Bio" subtitle="Short text shown on your profile header">
                <BioForm afterSubmit={noop} submitText="Save Bio" />
              </Section>

              <Section id="profile-picture" icon={ImageIcon} title="Profile Picture" subtitle="Avatar shown on posts, comments, and your profile">
                <ProfilePictureForm afterSubmit={noop} submitText="Save Picture" />
              </Section>

              <Section id="cover-photo" icon={Layers} title="Cover Photo" subtitle="Banner image at the top of your profile (image or video)">
                <CoverPictureForm afterSubmit={noop} submitText="Save Cover" />
              </Section>

              <Section id="genres" icon={Music} title="Favorite Genres" subtitle="What you make + what you listen to. Up to 5.">
                <FavoriteGenresForm afterSubmit={noop} submitText="Save Genres" />
              </Section>

              <Section id="musician-type" icon={Mic} title="Musician Type" subtitle="Producer, vocalist, instrumentalist, DJ, etc. Tap multiple.">
                <MusicianTypesForm afterSubmit={noop} submitText="Save Types" />
              </Section>

              <Section id="social-links" icon={LinkIcon} title="Social Links" subtitle="Twitter, Instagram, TikTok, YouTube, Spotify, Bandcamp, your own site">
                <SocialLinksForm afterSubmit={noop} submitText="Save Links" />
              </Section>

              <Section id="security" icon={Shield} title="Security" subtitle="2FA, login methods, account recovery">
                <SecurityForm afterSubmit={noop} submitText="Save Security" />
              </Section>

              {/* Anchor links so users can deep-link to a specific section */}
              <div className="pt-4 text-[10px] font-mono uppercase tracking-[0.25em] text-white/30 text-center">
                Tap any header to expand · changes save in place
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
