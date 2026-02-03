/**
 * SoundChain Media Compression Engine
 *
 * High-quality client-side compression that maintains visual fidelity
 * while fitting files within platform requirements.
 *
 * Easter egg: Users don't see size limits - compression just works! 🔥
 */

// Target constraints (hidden from users)
const COMPRESSION_CONFIG = {
  // Story/Reel constraints
  story: {
    maxFileSize: 1024 * 1024 * 1024, // 1 GB
    maxDuration: 600, // 10 minutes
    targetBitrate: 8000000, // 8 Mbps for high quality
    minBitrate: 2000000, // 2 Mbps minimum
  },
  // Post media constraints
  post: {
    maxImageSize: 10 * 1024 * 1024, // 10 MB for images
    maxVideoSize: 100 * 1024 * 1024, // 100 MB for post videos
    targetBitrate: 5000000, // 5 Mbps
  },
  // Image quality settings
  image: {
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 0.92, // High quality JPEG
    minQuality: 0.7, // Don't go below this
  }
}

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  compressionRatio: number
  wasCompressed: boolean
  duration?: number // For videos
  width?: number
  height?: number
}

export interface CompressionProgress {
  stage: 'analyzing' | 'compressing' | 'finalizing'
  progress: number // 0-100
  message: string
}

type ProgressCallback = (progress: CompressionProgress) => void

/**
 * Compress an image file while maintaining quality
 */
export async function compressImage(
  file: File,
  maxSize: number = COMPRESSION_CONFIG.post.maxImageSize,
  onProgress?: ProgressCallback
): Promise<CompressionResult> {
  const originalSize = file.size

  onProgress?.({ stage: 'analyzing', progress: 10, message: 'Analyzing image...' })

  // If already under size, return as-is
  if (file.size <= maxSize) {
    return {
      file,
      originalSize,
      compressedSize: file.size,
      compressionRatio: 1,
      wasCompressed: false,
    }
  }

  onProgress?.({ stage: 'compressing', progress: 30, message: 'Optimizing quality...' })

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not create canvas context'))
      return
    }

    img.onload = async () => {
      let { width, height } = img
      const { maxWidth, maxHeight } = COMPRESSION_CONFIG.image

      // Scale down if too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      // Draw with high quality
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      onProgress?.({ stage: 'compressing', progress: 60, message: 'Compressing...' })

      // Binary search for optimal quality
      let quality = COMPRESSION_CONFIG.image.quality
      let blob: Blob | null = null
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        blob = await new Promise<Blob | null>(res =>
          canvas.toBlob(res, 'image/jpeg', quality)
        )

        if (!blob) break

        if (blob.size <= maxSize || quality <= COMPRESSION_CONFIG.image.minQuality) {
          break
        }

        // Reduce quality for next iteration
        quality -= 0.05
        attempts++

        onProgress?.({
          stage: 'compressing',
          progress: 60 + (attempts / maxAttempts) * 30,
          message: `Optimizing... (${Math.round(quality * 100)}% quality)`
        })
      }

      if (!blob) {
        reject(new Error('Failed to compress image'))
        return
      }

      onProgress?.({ stage: 'finalizing', progress: 95, message: 'Finalizing...' })

      // Create new file with original name
      const compressedFile = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, '.jpg'),
        { type: 'image/jpeg' }
      )

      onProgress?.({ stage: 'finalizing', progress: 100, message: 'Done!' })

      resolve({
        file: compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        compressionRatio: originalSize / compressedFile.size,
        wasCompressed: true,
        width,
        height,
      })
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compress a video file while maintaining quality
 * Uses canvas + MediaRecorder for browser-native compression
 */
export async function compressVideo(
  file: File,
  maxSize: number = COMPRESSION_CONFIG.story.maxFileSize,
  onProgress?: ProgressCallback
): Promise<CompressionResult> {
  const originalSize = file.size

  onProgress?.({ stage: 'analyzing', progress: 5, message: 'Analyzing video...' })

  // Get video metadata
  const videoUrl = URL.createObjectURL(file)
  const metadata = await getVideoMetadata(videoUrl)

  // If already under size and duration, return as-is
  if (file.size <= maxSize && metadata.duration <= COMPRESSION_CONFIG.story.maxDuration) {
    URL.revokeObjectURL(videoUrl)
    return {
      file,
      originalSize,
      compressedSize: file.size,
      compressionRatio: 1,
      wasCompressed: false,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    }
  }

  onProgress?.({ stage: 'compressing', progress: 10, message: 'Preparing compression...' })

  // Calculate target bitrate based on file size and duration
  const targetDuration = Math.min(metadata.duration, COMPRESSION_CONFIG.story.maxDuration)
  const targetBitsPerSecond = Math.min(
    COMPRESSION_CONFIG.story.targetBitrate,
    Math.floor((maxSize * 8) / targetDuration * 0.9) // 90% of max to be safe
  )

  // Ensure we don't go below minimum quality
  const finalBitrate = Math.max(targetBitsPerSecond, COMPRESSION_CONFIG.story.minBitrate)

  onProgress?.({ stage: 'compressing', progress: 15, message: 'Transcoding video...' })

  try {
    const compressedBlob = await transcodeVideo(
      videoUrl,
      metadata,
      finalBitrate,
      targetDuration,
      (progress) => {
        onProgress?.({
          stage: 'compressing',
          progress: 15 + progress * 0.8,
          message: `Compressing... ${Math.round(progress * 100)}%`
        })
      }
    )

    URL.revokeObjectURL(videoUrl)

    onProgress?.({ stage: 'finalizing', progress: 98, message: 'Finalizing...' })

    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.[^.]+$/, '.webm'),
      { type: 'video/webm' }
    )

    onProgress?.({ stage: 'finalizing', progress: 100, message: 'Done!' })

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: originalSize / compressedFile.size,
      wasCompressed: true,
      duration: targetDuration,
      width: metadata.width,
      height: metadata.height,
    }
  } catch (error) {
    URL.revokeObjectURL(videoUrl)
    throw error
  }
}

/**
 * Get video metadata (duration, dimensions)
 */
function getVideoMetadata(videoUrl: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    video.onerror = () => reject(new Error('Failed to load video metadata'))
    video.src = videoUrl
  })
}

/**
 * Transcode video using canvas + MediaRecorder
 * This is a browser-native approach that works without external libraries
 */
async function transcodeVideo(
  videoUrl: string,
  metadata: { duration: number; width: number; height: number },
  targetBitrate: number,
  maxDuration: number,
  onProgress: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not create canvas context'))
      return
    }

    // Scale down large videos for better compression
    let { width, height } = metadata
    const maxDimension = 1920 // 1080p max

    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    canvas.width = width
    canvas.height = height

    video.muted = false // Keep audio
    video.src = videoUrl

    video.onloadeddata = () => {
      // Create MediaRecorder with canvas stream
      const stream = canvas.captureStream(30) // 30 FPS

      // Try to capture audio from video
      try {
        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaElementSource(video)
        const destination = audioCtx.createMediaStreamDestination()
        source.connect(destination)
        source.connect(audioCtx.destination) // Also play locally

        // Add audio track to stream
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track)
        })
      } catch (e) {
        // Audio capture failed, continue without audio
        console.warn('Could not capture audio:', e)
      }

      const chunks: Blob[] = []

      // Try VP9 first (better quality), fall back to VP8
      let mimeType = 'video/webm;codecs=vp9,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: targetBitrate,
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        resolve(blob)
      }

      recorder.onerror = (e) => {
        reject(new Error('Recording failed'))
      }

      // Start recording
      recorder.start(100) // Collect data every 100ms

      // Play and draw frames
      const duration = Math.min(metadata.duration, maxDuration)
      const startTime = Date.now()

      const drawFrame = () => {
        if (video.ended || video.currentTime >= duration) {
          recorder.stop()
          video.pause()
          return
        }

        ctx.drawImage(video, 0, 0, width, height)

        // Report progress
        const progress = video.currentTime / duration
        onProgress(progress)

        requestAnimationFrame(drawFrame)
      }

      video.onended = () => {
        recorder.stop()
      }

      video.ontimeupdate = () => {
        if (video.currentTime >= duration) {
          video.pause()
          recorder.stop()
        }
      }

      video.play().then(() => {
        drawFrame()
      }).catch(reject)
    }

    video.onerror = () => reject(new Error('Failed to load video'))
  })
}

/**
 * Smart compress - automatically determines if compression is needed
 * and applies the appropriate compression strategy
 */
export async function smartCompress(
  file: File,
  type: 'story' | 'post' = 'post',
  onProgress?: ProgressCallback
): Promise<CompressionResult> {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (isImage) {
    const maxSize = type === 'story'
      ? COMPRESSION_CONFIG.story.maxFileSize
      : COMPRESSION_CONFIG.post.maxImageSize
    return compressImage(file, maxSize, onProgress)
  }

  if (isVideo) {
    const maxSize = type === 'story'
      ? COMPRESSION_CONFIG.story.maxFileSize
      : COMPRESSION_CONFIG.post.maxVideoSize
    return compressVideo(file, maxSize, onProgress)
  }

  // Unknown file type, return as-is
  return {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 1,
    wasCompressed: false,
  }
}

/**
 * Quick check if file needs compression
 */
export function needsCompression(file: File, type: 'story' | 'post' = 'post'): boolean {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (isImage) {
    const maxSize = type === 'story'
      ? COMPRESSION_CONFIG.story.maxFileSize
      : COMPRESSION_CONFIG.post.maxImageSize
    return file.size > maxSize
  }

  if (isVideo) {
    const maxSize = type === 'story'
      ? COMPRESSION_CONFIG.story.maxFileSize
      : COMPRESSION_CONFIG.post.maxVideoSize
    return file.size > maxSize
  }

  return false
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
