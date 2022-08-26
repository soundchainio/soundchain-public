import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { cacheFor } from 'lib/apollo'
import { protectPage } from 'lib/protectPage'
import { useEffect } from 'react'

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(FeedbackPage, {}, context, apolloClient)
})

const topNavBarProps: TopNavBarProps = {
  title: 'Leave Feedback',
}

export default function FeedbackPage() {
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  return (
    <>
      <SEO
        title="Feedback | SoundChain"
        description="Submit your feedback to SoundChain team"
        canonicalUrl="/feedback/"
      />
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLScmoMksAwl26GABnutNksgWOlfDGvfZbGeEqAiaSqIHo5sI9g/viewform?embedded=true"
        className="h-full w-full"
        title="Feedback form"
      />
    </>
  )
}
