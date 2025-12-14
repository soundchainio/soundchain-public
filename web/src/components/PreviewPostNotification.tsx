import { usePostQuery } from 'lib/graphql'
import NextLink from 'next/link'
import React from 'react'
import { EmoteRenderer } from './EmoteRenderer'

interface PreviewPostNotificationProps {
  postId: string
}

export const PreviewPostNotification = ({ postId }: PreviewPostNotificationProps) => {
  const { data } = usePostQuery({ variables: { id: postId } })
  const post = data?.post

  if (!post || !post.body) {
    return null
  }

  return (
    <div className="mt-4 flex w-full rounded-xl bg-gray-30 p-4">
      <NextLink href={`/posts/${post.id}`}>
        <div>
          <pre className="whitespace-pre-wrap text-sm text-gray-100">
            <EmoteRenderer text={post.body} />
          </pre>
        </div>
      </NextLink>
      {post.mediaLink && (
        <iframe
          frameBorder="0"
          className="mt-4 w-full bg-gray-20"
          allowFullScreen
          src={post.mediaLink}
          title="Media preview"
        />
      )}
    </div>
  )
}
