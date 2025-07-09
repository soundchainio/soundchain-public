import { useEffect } from 'react'

import { Avatar } from 'components/Avatar'
import { Label } from 'components/Label'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useUpdateProfileBioMutation } from 'lib/graphql'
import { useRouter } from 'next/router'
import * as yup from 'yup'
import Link from 'next/link'
import { RightArrow } from 'icons/RightArrow'
import Image from 'next/image'
import { getGenreLabelByKey } from 'utils/Genres'
import { getMusicianTypeLabelByKey } from 'utils/MusicianTypes'

interface SettingsLinkProps {
  label: string
  value: string
  to?: string
  href?: string
  onClick?: () => void
  children?: React.ReactNode
  passHref?: boolean
  className?: string // Added className to support styling prop
}

function SettingsLink({ label, value, to, href, onClick, children, passHref, className }: SettingsLinkProps) {
  return (
    <Link
      href={href || `/settings${to || ''}`}
      passHref={passHref}
      style={{ overflowWrap: 'anywhere' }}
      className={className}
      onClick={onClick}
    >
      <div className="flex-1">
        <span className="block text-xs font-bold uppercase text-gray-50"> {label} </span>
        <span className="mt-1 block font-bold text-white"> {value} </span>
      </div>
      {children || <RightArrow />}
    </Link>
  )
}

function OTPLink({ label, value, to, secret, onClick, passHref, className }: SettingsLinkProps & { secret: string }) {
  return (
    <Link
      href={`/settings${to || ''}`}
      passHref={passHref}
      className={className}
      onClick={onClick}
    >
      <div className="flex-1">
        <span className="block text-xs font-bold uppercase text-gray-50"> {label} </span>
        <span className={`${secret ? 'text-green-700' : 'text-red-700'} mt-1 block font-bold`}> {value} </span>
      </div>
      <RightArrow />
    </Link>
  )
}

function FakeLink({ label, value, className }: SettingsLinkProps) {
  return (
    <div>
      <a className={`flex h-16 w-full items-center justify-center px-4 py-2 ${className || ''}`}>
        <div className="flex-1">
          <span className="block text-xs font-bold uppercase text-gray-50"> {label} </span>
          <span className="mt-1 block font-bold text-white"> {value} </span>
        </div>
      </a>
    </div>
  )
}

const topNavBarProps: TopNavBarProps = {
  title: 'Account Settings',
}

export default function SettingsPage() {
  const me = useMe()
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  if (!me) return null

  const genres = me.profile?.favoriteGenres?.map(getGenreLabelByKey).join(', ')

  const musicianTypes = me.profile?.musicianTypes?.map(getMusicianTypeLabelByKey).join(', ')

  return (
    <>
      <SEO title="Account Settings | SoundChain" canonicalUrl="/settings/" description="SoundChain Account Settings" />
      <div className="mt-8 flex flex-col gap-8">
        <div className="flex flex-row px-4">
          <SettingsLink
            href="/settings/profile-picture"
            passHref
            className="flex w-5/12 cursor-pointer flex-col items-center justify-center space-y-2 self-center"
            label=""
            value=""
          >
            <Avatar profile={me.profile} pixels={80} className="h-[80px]" linkToProfile={false} />
            <Label textSize="xs" className="text-center underline">
              Change Profile Photo
            </Label>
          </SettingsLink>
          <SettingsLink
            href="/settings/cover-picture"
            passHref
            className="flex w-7/12 cursor-pointer flex-col space-y-2"
            label=""
            value=""
          >
            <div className="relative h-[80px]">
              <Image
                src={me.profile.coverPicture || '/default-pictures/cover/fog.jpeg'}
                className="rounded-lg"
                alt="Cover pic"
                fill
                objectFit="cover"
              />
            </div>
            <Label textSize="xs" className="text-center underline">
              Change Cover Photo
            </Label>
          </SettingsLink>
        </div>
        <div className="grid bg-gray-15">
          <FakeLink to="/email" label="Email address" value={me.email} />
          <SettingsLink to="/name" label="Name" value={me.profile.displayName} />
          <SettingsLink to="/username" label="Username" value={me.handle} />
          <SettingsLink to="/bio" label="Bio" value={me.profile.bio || 'Add a bio...'} />
          <SettingsLink to="/musician-type" label="Musician Type(s)" value={musicianTypes || 'Not selected'} />
          <SettingsLink to="/favorite-genres" label="Favorite Genre(s)" value={genres || 'Not selected'} />
          <SettingsLink to="/social-links" label="Social Link(s)" value={'Click to view your social links'} />
          <OTPLink
            to="/security"
            label="Two-factor Security"
            secret={me.otpSecret || ''}
            value={me.otpSecret ? 'Enabled' : 'Disabled'}
          />
        </div>
      </div>
    </>
  )
}
