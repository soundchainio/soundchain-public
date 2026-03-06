import { Subtitle } from 'components/Subtitle'

interface DescriptionProps {
  description: string
  className?: string
}

export const Description = ({ description, className }: DescriptionProps) => {
  if (!description) return null

  // URL detection regex - same as UtilityInfo for consistency
  const urlRegex = /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/g
  const urls = description.match(urlRegex)
  const contentSplit = description.split(urlRegex)

  const wrapTags = () => {
    return contentSplit.map((partialContent, idx) => {
      if (urls && urls.length > idx) {
        const normalizedUrl =
          !urls[idx].startsWith('http://') && !urls[idx].startsWith('https://') ? 'https://' + urls[idx] : urls[idx]
        return (
          <>
            {partialContent}
            <a href={normalizedUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
              {urls[idx]}
            </a>
          </>
        )
      }
      return partialContent
    })
  }

  return (
    <div className={className}>
      <Subtitle className="font-bold text-gray-CC" size="xs">
        DESCRIPTION
      </Subtitle>
      <p className="py-2 text-xs font-medium text-gray-80">
        <pre className="whitespace-pre-wrap">{wrapTags()}</pre>
      </p>
    </div>
  )
}
