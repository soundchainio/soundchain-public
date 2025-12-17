/**
 * Post Archive System
 *
 * Allows users to archive their 24-hour ephemeral posts directly to their devices.
 * Archives include the post content, media files, and metadata in a portable format.
 *
 * Web3 Philosophy: YOUR content, YOUR device, YOUR control.
 */

import JSZip from 'jszip'

// Archive file format version for future compatibility
const ARCHIVE_VERSION = '1.0'
const ARCHIVE_EXTENSION = '.soundchain'

export interface PostArchiveMetadata {
  version: string
  archiveDate: string
  originalPostId: string
  originalCreatedAt: string
  body: string | null
  mediaType: 'image' | 'video' | 'audio' | null
  mediaFilename: string | null
  profile: {
    id: string
    displayName: string
    userHandle: string
  }
  // For future: emotes, reactions count, etc.
  stats?: {
    reactions: number
    comments: number
    reposts: number
  }
}

export interface PostArchiveData {
  metadata: PostArchiveMetadata
  mediaBlob?: Blob
  thumbnailBlob?: Blob
}

/**
 * Fetch media file as blob from URL
 */
async function fetchMediaAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status}`)
  }
  return response.blob()
}

/**
 * Get file extension from media type
 */
function getExtensionForMediaType(mediaType: string, mimeType?: string): string {
  if (mediaType === 'image') {
    if (mimeType?.includes('png')) return 'png'
    if (mimeType?.includes('gif')) return 'gif'
    if (mimeType?.includes('webp')) return 'webp'
    return 'jpg'
  }
  if (mediaType === 'video') {
    if (mimeType?.includes('webm')) return 'webm'
    if (mimeType?.includes('mov')) return 'mov'
    return 'mp4'
  }
  if (mediaType === 'audio') {
    if (mimeType?.includes('wav')) return 'wav'
    if (mimeType?.includes('flac')) return 'flac'
    if (mimeType?.includes('ogg')) return 'ogg'
    return 'mp3'
  }
  return 'bin'
}

/**
 * Create an archive from a post
 */
export async function createPostArchive(post: {
  id: string
  body: string | null
  createdAt: string
  uploadedMediaUrl?: string | null
  uploadedMediaType?: string | null
  totalReactions?: number
  commentCount?: number
  repostCount?: number
  profile?: {
    id: string
    displayName: string
    userHandle: string
  } | null
}): Promise<Blob> {
  const zip = new JSZip()

  // Determine media filename
  let mediaFilename: string | null = null

  // Add media file if exists
  if (post.uploadedMediaUrl && post.uploadedMediaType) {
    try {
      const mediaBlob = await fetchMediaAsBlob(post.uploadedMediaUrl)
      const extension = getExtensionForMediaType(post.uploadedMediaType, mediaBlob.type)
      mediaFilename = `media.${extension}`
      zip.file(mediaFilename, mediaBlob)
    } catch (error) {
      console.error('Failed to fetch media for archive:', error)
      // Continue without media
    }
  }

  // Create metadata
  const metadata: PostArchiveMetadata = {
    version: ARCHIVE_VERSION,
    archiveDate: new Date().toISOString(),
    originalPostId: post.id,
    originalCreatedAt: post.createdAt,
    body: post.body,
    mediaType: post.uploadedMediaType as 'image' | 'video' | 'audio' | null,
    mediaFilename,
    profile: post.profile ? {
      id: post.profile.id,
      displayName: post.profile.displayName,
      userHandle: post.profile.userHandle,
    } : {
      id: 'unknown',
      displayName: 'Unknown',
      userHandle: 'unknown',
    },
    stats: {
      reactions: post.totalReactions || 0,
      comments: post.commentCount || 0,
      reposts: post.repostCount || 0,
    },
  }

  // Add metadata file
  zip.file('post.json', JSON.stringify(metadata, null, 2))

  // Generate the archive
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

/**
 * Generate filename for the archive
 */
export function generateArchiveFilename(post: {
  profile?: { userHandle: string } | null
  createdAt: string
}): string {
  const handle = post.profile?.userHandle || 'post'
  const date = new Date(post.createdAt)
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
  return `${handle}_${dateStr}_${timeStr}${ARCHIVE_EXTENSION}`
}

/**
 * Download archive to device
 */
export async function downloadArchive(
  archiveBlob: Blob,
  filename: string,
  onMobile?: boolean
): Promise<boolean> {
  // Check if we can use native share (mobile)
  if (onMobile && navigator.share && navigator.canShare) {
    const file = new File([archiveBlob], filename, { type: 'application/zip' })

    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'SoundChain Post Archive',
          text: 'Save your archived post',
        })
        return true
      } catch (error: any) {
        // User cancelled or share failed, fall back to download
        if (error.name === 'AbortError') {
          return false // User cancelled
        }
      }
    }
  }

  // Fallback: Standard download
  const url = URL.createObjectURL(archiveBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return true
}

/**
 * Read and parse an archive file
 */
export async function readPostArchive(file: File): Promise<PostArchiveData> {
  const zip = await JSZip.loadAsync(file)

  // Read metadata
  const metadataFile = zip.file('post.json')
  if (!metadataFile) {
    throw new Error('Invalid archive: missing post.json')
  }

  const metadataJson = await metadataFile.async('string')
  const metadata: PostArchiveMetadata = JSON.parse(metadataJson)

  // Validate version
  if (!metadata.version) {
    throw new Error('Invalid archive: missing version')
  }

  // Read media if exists
  let mediaBlob: Blob | undefined
  if (metadata.mediaFilename) {
    const mediaFile = zip.file(metadata.mediaFilename)
    if (mediaFile) {
      const mediaData = await mediaFile.async('blob')
      mediaBlob = mediaData
    }
  }

  return {
    metadata,
    mediaBlob,
  }
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
         window.innerWidth < 768
}

/**
 * Validate archive file
 */
export function isValidArchiveFile(file: File): boolean {
  return file.name.endsWith(ARCHIVE_EXTENSION) ||
         file.type === 'application/zip' ||
         file.name.endsWith('.zip')
}
