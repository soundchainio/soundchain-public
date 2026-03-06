/**
 * useTrackComments - Hook for managing SoundCloud-style timestamped comments
 *
 * Provides all the data and mutations needed for the WaveformWithComments component.
 */

import { useCallback } from 'react'
import { useTrackCommentsQuery, useCreateTrackCommentMutation, useLikeTrackCommentMutation, useDeleteTrackCommentMutation, useTrackCommentCountQuery } from 'lib/graphql'
import { useMe } from './useMe'
import { toast } from 'react-toastify'

interface UseTrackCommentsOptions {
  trackId: string
  pageSize?: number
}

export function useTrackComments({ trackId, pageSize = 100 }: UseTrackCommentsOptions) {
  const me = useMe()

  // Fetch comments
  const { data, loading, error, refetch } = useTrackCommentsQuery({
    variables: {
      trackId,
      page: { first: pageSize }
    },
    skip: !trackId,
    fetchPolicy: 'cache-and-network',
  })

  // Fetch comment count
  const { data: countData } = useTrackCommentCountQuery({
    variables: { trackId },
    skip: !trackId,
  })

  // Mutations
  const [createComment, { loading: creating }] = useCreateTrackCommentMutation()
  const [likeComment, { loading: liking }] = useLikeTrackCommentMutation()
  const [deleteComment, { loading: deleting }] = useDeleteTrackCommentMutation()

  // Add a new comment
  const addComment = useCallback(async (text: string, timestamp: number, embedUrl?: string) => {
    if (!me) {
      toast.error('Please login to comment')
      return
    }

    try {
      await createComment({
        variables: { trackId, text, timestamp, embedUrl: embedUrl || undefined },
        update: (cache, { data }) => {
          // Refetch to get updated list
          refetch()
        },
      })
      toast.success('Comment added!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment')
      throw err
    }
  }, [trackId, me, createComment, refetch])

  // Like a comment
  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!me) {
      toast.error('Please login to like comments')
      return
    }

    try {
      await likeComment({
        variables: { commentId },
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to like comment')
    }
  }, [me, likeComment])

  // Delete a comment
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!me) return

    try {
      await deleteComment({
        variables: { commentId },
        update: () => refetch(),
      })
      toast.success('Comment deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete comment')
    }
  }, [me, deleteComment, refetch])

  // Transform comments for the component
  const comments = data?.trackComments?.nodes?.map(comment => ({
    id: comment.id,
    text: comment.text,
    timestamp: comment.timestamp,
    likeCount: comment.likeCount,
    isPinned: comment.isPinned,
    createdAt: comment.createdAt,
    profile: {
      id: comment.profile.id,
      displayName: comment.profile.displayName,
      profilePicture: comment.profile.profilePicture,
      userHandle: comment.profile.userHandle,
    },
  })) || []

  return {
    comments,
    commentCount: countData?.trackCommentCount || comments.length,
    loading,
    error,
    creating,
    addComment,
    likeComment: handleLikeComment,
    deleteComment: handleDeleteComment,
    refetch,
    isLoggedIn: !!me,
  }
}

export default useTrackComments
