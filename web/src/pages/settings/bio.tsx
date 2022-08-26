import { BioForm } from 'components/forms/profile/BioForm'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

const topNavBarProps: TopNavBarProps = {
  title: 'Bio',
}

export default function BioPage() {
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
      <SEO title="Bio | SoundChain" canonicalUrl="/settings/bio" description="SoundChain Bio" />
      <div className="flex min-h-full flex-col px-6 py-6 lg:px-8">
        <BioForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </>
  )
}
