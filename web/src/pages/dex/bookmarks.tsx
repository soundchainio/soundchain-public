import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { useMyBookmarksQuery } from 'lib/graphql'
import { Post } from 'components/Post/Post'
import { PostSkeleton } from 'components/Post/PostSkeleton'
import Head from 'next/head'

export default function BookmarksPage() {
  const router = useRouter()
  const me = useMe()

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (me === null) {
      router.push('/login')
    }
  }, [me, router])

  const { data, loading, error, fetchMore } = useMyBookmarksQuery({
    skip: !me,
    variables: {
      page: { first: 20 }
    },
    fetchPolicy: 'cache-and-network',
  })

  const bookmarks = data?.myBookmarks?.nodes || []
  const hasNextPage = data?.myBookmarks?.pageInfo?.hasNextPage || false
  const totalCount = data?.myBookmarks?.pageInfo?.totalCount || 0

  const handleLoadMore = () => {
    if (hasNextPage && bookmarks.length > 0) {
      const lastBookmark = bookmarks[bookmarks.length - 1]
      fetchMore({
        variables: {
          page: { first: 20, after: lastBookmark.id }
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            myBookmarks: {
              ...fetchMoreResult.myBookmarks,
              nodes: [
                ...(prev.myBookmarks?.nodes || []),
                ...(fetchMoreResult.myBookmarks?.nodes || [])
              ]
            }
          }
        }
      })
    }
  }

  // Handle track play - placeholder for now
  const handleOnPlayClicked = (trackId: string) => {
    console.log('Play track:', trackId)
  }

  if (me === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Saved Posts | SoundChain</title>
      </Head>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-neutral-800">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-lg">Saved Posts</h1>
              {totalCount > 0 && (
                <p className="text-sm text-neutral-500">{totalCount} saved</p>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-2xl mx-auto px-4 py-4">
          {loading && bookmarks.length === 0 ? (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <p>Error loading bookmarks</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-800 mb-4">
                <Bookmark className="w-8 h-8 text-neutral-500" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No saved posts yet</h2>
              <p className="text-neutral-500 mb-4">
                When you save posts, they&apos;ll appear here.
              </p>
              <Link
                href="/dex"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-medium rounded-full transition-colors"
              >
                Explore Feed
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookmarks.map((bookmark) => (
                bookmark.post && (
                  <Post
                    key={bookmark.id}
                    post={bookmark.post}
                    handleOnPlayClicked={handleOnPlayClicked}
                  />
                )
              ))}

              {/* Load more button */}
              {hasNextPage && (
                <div className="text-center py-4">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm font-medium transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
