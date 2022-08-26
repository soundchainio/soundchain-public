import { Avatar } from 'components/Avatar'
import { Label } from 'components/Label'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { RightArrow } from 'icons/RightArrow'
import Image from 'next/image'
import NextLink from 'next/link'
import { useEffect } from 'react'
import { getGenreLabelByKey } from 'utils/Genres'
import { getMusicianTypeLabelByKey } from 'utils/MusicianTypes'

interface LinkProps {
  label: string
  value: string
  to?: string
  onClick?: () => void
}

function Link({ label, value, to }: LinkProps) {
  return (
    <NextLink href={`/settings${to}`}>
      <a style={{ overflowWrap: 'anywhere' }} className="flex w-full items-center justify-center px-4 py-2">
        <div className="flex-1">
          <span className="block text-xs font-bold uppercase text-gray-50"> {label} </span>
          <span className="mt-1 block font-bold text-white"> {value} </span>
        </div>
        <RightArrow />
      </a>
    </NextLink>
  )
}

function OTPLink({ label, value, to, secret }: LinkProps & { secret: string }) {
  return (
    <NextLink href={`/settings${to}`}>
      <a className="flex w-full items-center justify-center px-4 py-2">
        <div className="flex-1">
          <span className="block text-xs font-bold uppercase text-gray-50"> {label} </span>
          <span className={`${secret ? 'text-green-700' : 'text-red-700'} mt-1 block font-bold`}> {value} </span>
        </div>
        <RightArrow />
      </a>
    </NextLink>
  )
}

function FakeLink({ label, value }: LinkProps) {
  return (
    <div>
      <a className="flex h-16 w-full items-center justify-center px-4 py-2">
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
          <NextLink href="/settings/profile-picture" passHref>
            <a className="flex w-5/12 cursor-pointer flex-col items-center justify-center space-y-2 self-center">
              <Avatar profile={me.profile} pixels={80} className="h-[80px]" linkToProfile={false} />
              <Label textSize="xs" className="text-center underline">
                Change Profile Photo
              </Label>
            </a>
          </NextLink>
          <NextLink href="/settings/cover-picture" passHref>
            <a className="flex w-7/12 cursor-pointer flex-col space-y-2">
              <div className="relative h-[80px]">
                <Image
                  src={me.profile.coverPicture || '/default-pictures/cover/fog.jpeg'}
                  className="rounded-lg"
                  alt="Cover pic"
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              <Label textSize="xs" className="text-center underline">
                Change Cover Photo
              </Label>
            </a>
          </NextLink>
        </div>
        <div className="grid bg-gray-15">
          <FakeLink to="/email" label="Email address" value={me.email} />
          <Link to="/name" label="Name" value={me.profile.displayName} />
          <Link to="/username" label="Username" value={me.handle} />
          <Link to="/bio" label="Bio" value={me.profile.bio || 'Add a bio...'} />
          <Link to="/musician-type" label="Musician Type(s)" value={musicianTypes || 'Not selected'} />
          <Link to="/favorite-genres" label="Favorite Genre(s)" value={genres || 'Not selected'} />
          <Link to="/social-links" label="Social Link(s)" value={'Click to view your social links' || 'Not selected'} />
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
