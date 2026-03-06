import { BioForm } from 'components/forms/profile/BioForm'
import SEO from 'components/SEO'
import { StepProgressBar } from 'components/StepProgressBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { SkipButton, steps } from 'utils/createAccountUtils'

export default function BioPage() {
  const router = useRouter()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps({
      title: 'Bio',

      rightButton: <SkipButton href="/create-account/social-links" />,
      subtitle: <StepProgressBar steps={steps} currentStep={5} />,
    })
    setHideBottomNavBar(true)
  }, [setHideBottomNavBar, setTopNavBarProps])

  return (
    <>
      <SEO title="Bio | SoundChain" canonicalUrl="/create-account/bio" description="SoundChain Bio" />
      <div className="flex min-h-full flex-col bg-gray-20 px-6 py-6 lg:px-8">
        <BioForm
          afterSubmit={() => router.push('/create-account/social-links')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-blue-gradient' }}
        />
      </div>
    </>
  )
}
