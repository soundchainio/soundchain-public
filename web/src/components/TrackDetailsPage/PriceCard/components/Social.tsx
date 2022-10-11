import { ReactionEmoji } from 'icons/ReactionEmoji'
import { useGetOriginalPostFromTrackQuery } from 'lib/graphql'
import NextLink from 'next/link'
import tw from 'tailwind-styled-components'

interface Props {
  trackId: string
}

export const Social = (props: Props) => {
  const { trackId } = props

  const { data: originalPostData } = useGetOriginalPostFromTrackQuery({
    variables: {
      trackId: trackId,
    },
    skip: !trackId,
  })

  const post = originalPostData?.getOriginalPostFromTrack

  return (
    <Container>
      <h3 className="text-xl font-bold text-white">Social</h3>
      {post && !post.deleted ? (
        <div className="flex flex-col items-center">
          <NextLink href={`/posts/${post.id}`}>
            <a className="mb-2 flex w-full items-center">
              <div className="bg-blue-gradient w-full rounded-lg p-[2px]">
                <button
                  type="button"
                  className="w-full rounded-lg bg-[#19191A] px-4 py-1 text-sm font-bold text-slate-50 hover:bg-transparent "
                >
                  View Post
                </button>
              </div>
            </a>
          </NextLink>

          <div className="flex items-center gap-2">
            <p className="flex items-center gap-1 text-sm text-slate-50">
              <span className="flex items-center gap-1 font-bold text-slate-50">
                {post.topReactions.map(name => (
                  <ReactionEmoji key={name} name={name} className="h-4 w-4" />
                ))}
                {post.totalReactions}
              </span>
              reactions
            </p>
            <p className="text-sm text-slate-50">
              <span className="font-bold text-white">{post.commentCount}</span> comments
            </p>
          </div>
        </div>
      ) : (
        <p className="text-grey-60">Social deleted</p>
      )}
    </Container>
  )
}

const Container = tw.div`
  flex 
  items-center 
  justify-between
  w-full
  mt-6
`
