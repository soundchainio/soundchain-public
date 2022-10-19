import { useApolloClient } from '@apollo/client'
import { PageInput, useCommentsQuery } from 'lib/graphql'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import { Comment } from './Comment'
import { CommentSkeleton } from './CommentSkeleton'
import { InfiniteLoader } from './InfiniteLoader'
import { LoaderAnimation } from './LoaderAnimation'

interface CommentsProps {
  postId: string
  pageSize?: number
}

export const Comments = ({ postId, pageSize = 10 }: CommentsProps) => {
  console.log({ pageSize })
  const router = useRouter()
  const { cache } = useApolloClient()
  const [scrollToCommentId, setScrollToCommentId] = useState<string | null>(null)
  const scrollToCommentRef = useRef<HTMLDivElement>(null)

  const inclusiveCursor = router.query.cursor
  const firstPage: PageInput = { first: pageSize }

  if (typeof inclusiveCursor === 'string') {
    firstPage.after = inclusiveCursor
    firstPage.inclusive = true
  }

  const { data, loading, fetchMore } = useCommentsQuery({
    variables: { postId, page: firstPage },
    ssr: false,
  })

  useEffect(() => {
    return () => {
      cache.evict({ fieldName: 'comments', args: { postId } })
    }
  }, [])

  useEffect(() => {
    if (scrollToCommentRef.current) {
      scrollToComment(scrollToCommentRef.current)
      setScrollToCommentId(null)
    }
  }, [data?.comments.nodes])

  if (!data || !fetchMore) {
    return (
      <div className="m-4 flex flex-col space-y-4">
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </div>
    )
  }

  const { nodes: comments, pageInfo } = data.comments

  const loadNext = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    })
  }

  const loadPrevious = () => {
    setScrollToCommentId(comments[0].id)
    fetchMore({
      variables: {
        page: {
          last: pageSize,
          before: pageInfo.startCursor,
          inclusive: false,
        },
      },
    })
  }

  return (
    <div className="m-4 flex flex-col space-y-4">
      {pageInfo.hasPreviousPage ? (
        loading ? (
          <LoaderAnimation loadingMessage="Loading Comments" />
        ) : (
          <div onClick={loadPrevious} className="cursor-pointer text-sm font-bold text-white">
            View Newer Comments
          </div>
        )
      ) : (
        <h3 className="font-thin text-white">Comments</h3>
      )}
      {comments.map(({ id }) => {
        if (id === scrollToCommentId) {
          return (
            <div key={id} ref={scrollToCommentRef}>
              <Comment commentId={id} />
            </div>
          )
        }
        return <Comment key={id} commentId={id} />
      })}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Comments" />}
    </div>
  )
}

function scrollToComment(el: HTMLElement) {
  el.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
