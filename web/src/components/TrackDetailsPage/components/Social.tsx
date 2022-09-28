import { BlueButton } from 'components/common/Buttons/BlueButton'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import { useGetOriginalPostFromTrackQuery } from 'lib/graphql'
import NextLink from 'next/link'
import styled from 'styled-components'

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
      <Title>Social</Title>

      {post && !post.deleted ? (
        <PostContainer>
          <NextLink href={`/posts/${post.id}`}>
            <Anchor>
              <BlueButton text="VIEW POST" />
            </Anchor>
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
        </PostContainer>
      ) : (
        <p className="text-grey-60">Social deleted</p>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h3`
  color: white;
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 700;
`
const PostContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`
const Anchor = styled.a`
  display: flex;
  margin-bottom: 0.5rem;
  align-items: center;
  width: 100%;
`
