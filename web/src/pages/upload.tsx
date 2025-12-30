/**
 * Non-Web3 Upload Page - Certificate Only
 *
 * Protected page for authenticated SoundChain users to upload music
 * without wallet/NFT/gas fees. Audio goes to IPFS, user downloads certificate.
 */

import { SimpleTrackUploadForm } from 'components/forms/track/SimpleTrackUploadForm'
import SEO from 'components/SEO'
import { useMe } from 'hooks/useMe'
import { useUpload } from 'hooks/useUpload'
import { cacheFor } from 'lib/apollo'
import { Genre, useCreateTrackWithScidMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useCallback } from 'react'

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(Upload, {}, context, apolloClient)
})

export default function Upload() {
  const me = useMe()
  const { upload } = useUpload()
  const [createTrackWithSCid] = useCreateTrackWithScidMutation()

  const handleUploadAudio = useCallback(async (file: File): Promise<string> => {
    const url = await upload([file])
    return url
  }, [upload])

  const handleUploadArtwork = useCallback(async (file: File): Promise<string> => {
    const url = await upload([file])
    return url
  }, [upload])

  const handleSubmit = useCallback(async (data: {
    title: string
    artist?: string
    album?: string
    description?: string
    releaseYear?: number
    copyright?: string
    genres?: string[]
    assetUrl: string
    artworkUrl?: string
    saveToDatabase?: boolean
  }) => {
    // Call the GraphQL mutation
    const result = await createTrackWithSCid({
      variables: {
        input: {
          title: data.title,
          description: data.description,
          assetUrl: data.assetUrl,
          artworkUrl: data.artworkUrl,
          artist: data.artist,
          album: data.album,
          releaseYear: data.releaseYear,
          copyright: data.copyright,
          genres: data.genres as Genre[] | undefined,
          createPost: false, // Don't create post for certificate-only uploads
        },
      },
    })

    const trackData = result.data?.createTrackWithSCid

    if (!trackData) {
      throw new Error('Failed to create track')
    }

    return {
      trackId: trackData.track.id,
      scid: trackData.scid?.scid || '',
      message: trackData.message,
      ipfsCid: trackData.track.ipfsCid || '',
      ipfsGatewayUrl: trackData.track.ipfsGatewayUrl || '',
      chainCode: trackData.scid?.chainCode,
    }
  }, [createTrackWithSCid])

  return (
    <>
      <SEO
        title="Upload Music | SoundChain"
        description="Upload your music to IPFS and get your SCid certificate. No wallet or gas fees required."
        canonicalUrl="/upload"
      />
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Upload Your Music
            </h1>
            <p className="text-gray-400">
              Get your music on IPFS with an SCid certificate.
              No wallet, no gas fees, full control.
            </p>
          </div>

          {/* Upload Form */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <SimpleTrackUploadForm
              onUploadAudio={handleUploadAudio}
              onUploadArtwork={handleUploadArtwork}
              onSubmit={handleSubmit}
            />
          </div>

          {/* Info Section */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Logged in as <span className="text-cyan-400">@{me?.handle}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
