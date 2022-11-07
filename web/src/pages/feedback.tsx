import SEO from 'components/SEO'

export default function FeedbackPage() {
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
