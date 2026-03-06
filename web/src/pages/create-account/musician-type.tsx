import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm'
import SEO from 'components/SEO'
import { StepProgressBar } from 'components/StepProgressBar'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { SkipButton, steps } from 'utils/createAccountUtils'

const topNavBarProps: TopNavBarProps = {
  title: 'Musician Type',

  rightButton: <SkipButton href="/create-account/bio" />,
  subtitle: <StepProgressBar steps={steps} currentStep={4} />,
}

export default function MusicianTypePage() {
  const router = useRouter()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setHideBottomNavBar(true)
  }, [setHideBottomNavBar, setTopNavBarProps])

  return (
    <>
      <SEO
        title="Musician Type | SoundChain"
        canonicalUrl="/create-account/musician-type"
        description="SoundChain Musician Type"
      />
      <div className="flex min-h-full flex-col bg-gray-20 px-6 py-6 lg:px-8">
        <div className="flex flex-1 flex-col space-y-6">
          <MusicianTypesForm
            afterSubmit={() => router.push('/create-account/bio')}
            submitText="NEXT"
            submitProps={{ borderColor: 'bg-blue-gradient' }}
          />
        </div>
      </div>
    </>
  )
}
