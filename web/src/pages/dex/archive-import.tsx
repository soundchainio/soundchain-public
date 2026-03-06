/**
 * Archive Import Page
 *
 * Allows users to import previously archived posts (.soundchain files)
 * and repost them to the feed.
 *
 * Web3 Philosophy: YOUR archive, YOUR control - repost anytime!
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ArchiveImport } from 'components/ArchiveImport'
import { PostArchiveMetadata } from 'lib/postArchive'
import { useUpload } from 'hooks/useUpload'
import { useCreatePostMutation, CreatePostInput } from 'lib/graphql'
import { useMe } from 'hooks/useMe'
import { toast } from 'react-toastify'
import { Archive, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ArchiveImportPage() {
  const router = useRouter()
  const me = useMe()
  const [isReposting, setIsReposting] = useState(false)
  const [importedData, setImportedData] = useState<{
    metadata: PostArchiveMetadata
    mediaBlob?: Blob
    mediaObjectUrl?: string
  } | null>(null)

  const [createPost] = useCreatePostMutation({
    refetchQueries: ['Posts', 'Feed'],
    awaitRefetchQueries: true,
  })

  const { upload } = useUpload(undefined, () => {}, false)

  const handleImport = useCallback((data: {
    metadata: PostArchiveMetadata
    mediaBlob?: Blob
    mediaObjectUrl?: string
  }) => {
    setImportedData(data)
  }, [])

  const handleRepost = useCallback(async () => {
    if (!importedData || !me) return

    setIsReposting(true)
    try {
      const newPostParams: CreatePostInput = {
        body: importedData.metadata.body || '',
      }

      // Re-upload media if present
      if (importedData.mediaBlob && importedData.metadata.mediaType) {
        // Convert blob to File
        const extension = importedData.metadata.mediaFilename?.split('.').pop() || 'bin'
        const mimeType = importedData.mediaBlob.type || `${importedData.metadata.mediaType}/*`
        const file = new File(
          [importedData.mediaBlob],
          `archived-media.${extension}`,
          { type: mimeType }
        )

        toast.info('Re-uploading media...', { autoClose: 2000 })
        const uploadedUrl = await upload([file])

        if (uploadedUrl) {
          (newPostParams as any).uploadedMediaUrl = uploadedUrl;
          (newPostParams as any).uploadedMediaType = importedData.metadata.mediaType;
        }
      }

      await createPost({ variables: { input: newPostParams } })
      toast.success('Post restored from archive!')

      // Cleanup object URL
      if (importedData.mediaObjectUrl) {
        URL.revokeObjectURL(importedData.mediaObjectUrl)
      }

      // Navigate to feed
      router.push('/dex')
    } catch (err: any) {
      console.error('Repost failed:', err)
      toast.error(err.message || 'Failed to repost from archive')
    } finally {
      setIsReposting(false)
    }
  }, [importedData, me, upload, createPost, router])

  const handleCancel = useCallback(() => {
    if (importedData?.mediaObjectUrl) {
      URL.revokeObjectURL(importedData.mediaObjectUrl)
    }
    setImportedData(null)
  }, [importedData])

  return (
    <>
      <Head>
        <title>Import Archive | SoundChain</title>
        <meta name="description" content="Import your archived posts back to the feed" />
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
            <div className="flex-1 flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-500" />
              <h1 className="font-semibold text-lg">Import Archive</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-2xl mx-auto px-4 py-4">
          {/* Login prompt for unauthenticated users */}
          {!me && (
            <div className="bg-neutral-900 rounded-lg p-6 text-center">
              <Archive className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Login Required</h2>
              <p className="text-neutral-400 mb-4">
                You need to be logged in to import and repost archived content.
              </p>
              <Link
                href="/login"
                className="inline-block py-2 px-4 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors"
              >
                Login
              </Link>
            </div>
          )}

          {/* Archive import UI for authenticated users */}
          {me && !importedData && (
            <ArchiveImport
              onImport={handleImport}
              onCancel={() => router.push('/dex')}
            />
          )}

          {/* Repost confirmation for imported archives */}
          {me && importedData && (
            <div className="bg-neutral-900 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-neutral-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-500" />
                  Ready to Repost
                </h3>
                <p className="text-neutral-400 text-sm mt-1">
                  This will create a new 24-hour post with your archived content.
                </p>
              </div>

              <div className="p-4">
                {/* Post body preview */}
                {importedData.metadata.body && (
                  <p className="text-neutral-200 whitespace-pre-wrap mb-4">
                    {importedData.metadata.body}
                  </p>
                )}

                {/* Media preview */}
                {importedData.mediaObjectUrl && importedData.metadata.mediaType && (
                  <div className="rounded-lg overflow-hidden bg-neutral-800 mb-4">
                    {importedData.metadata.mediaType === 'image' && (
                      <img
                        src={importedData.mediaObjectUrl}
                        alt="Archived media"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    )}
                    {importedData.metadata.mediaType === 'video' && (
                      <video
                        src={importedData.mediaObjectUrl}
                        controls
                        className="w-full max-h-96"
                      />
                    )}
                    {importedData.metadata.mediaType === 'audio' && (
                      <div className="p-4">
                        <audio src={importedData.mediaObjectUrl} controls className="w-full" />
                      </div>
                    )}
                  </div>
                )}

                {/* Original post info */}
                <div className="text-sm text-neutral-500 mb-4">
                  <p>Originally posted: {new Date(importedData.metadata.originalCreatedAt).toLocaleString()}</p>
                  <p>Archived: {new Date(importedData.metadata.archiveDate).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-neutral-800/50 flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isReposting}
                  className="flex-1 py-2 px-4 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRepost}
                  disabled={isReposting}
                  className="flex-1 py-2 px-4 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isReposting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reposting...
                    </>
                  ) : (
                    'Repost to Feed'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info section */}
          <div className="mt-6 text-center text-neutral-500 text-sm">
            <p>Archives contain your post text, media, and metadata.</p>
            <p className="mt-1">Supported formats: .soundchain, .zip</p>
          </div>
        </main>
      </div>
    </>
  )
}
