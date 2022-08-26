import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

const topNavBarProps: TopNavBarProps = {}

export default function ProfilePicturePage() {
  const router = useRouter()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setHideBottomNavBar(true)

    return () => {
      setHideBottomNavBar(false)
    }
  }, [setHideBottomNavBar, setTopNavBarProps])

  return (
    <>
      <SEO
        title="Profile Picture | SoundChain"
        canonicalUrl="/settings/profile-picture/"
        description="SoundChain Profile Picture"
      />
      <div className="flex min-h-full flex-col px-6 py-6 lg:px-8">
        <ProfilePictureForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </>
  )
}
