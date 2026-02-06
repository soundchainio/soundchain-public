/**
 * Media Crop Utility
 * Provides functions to crop images and capture video frames for cropping
 */

export interface CropArea {
  x: number      // Top-left x position in pixels
  y: number      // Top-left y position in pixels
  width: number  // Crop width in pixels
  height: number // Crop height in pixels
}

/**
 * Crop an image file and return a new cropped File
 */
export async function cropImage(
  file: File,
  cropArea: CropArea,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.92
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      try {
        // Create canvas with crop dimensions
        const canvas = document.createElement('canvas')
        canvas.width = cropArea.width
        canvas.height = cropArea.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Could not get canvas context')
        }

        // Enable high quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw the cropped region
        ctx.drawImage(
          img,
          cropArea.x,      // Source x
          cropArea.y,      // Source y
          cropArea.width,  // Source width
          cropArea.height, // Source height
          0,               // Dest x
          0,               // Dest y
          cropArea.width,  // Dest width
          cropArea.height  // Dest height
        )

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create cropped image blob'))
              return
            }

            // Create new File with same name but cropped content
            const extension = outputType === 'image/png' ? 'png' : 'jpg'
            const croppedFile = new File(
              [blob],
              `cropped-${Date.now()}.${extension}`,
              { type: outputType }
            )

            URL.revokeObjectURL(objectUrl)
            resolve(croppedFile)
          },
          outputType,
          quality
        )
      } catch (err) {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for cropping'))
    }

    img.src = objectUrl
  })
}

/**
 * Capture a frame from a video file for crop preview
 */
export async function captureVideoFrame(
  file: File,
  seekTime: number = 1 // Seek to 1 second by default
): Promise<{ imageUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.src = ''
      video.load()
    }

    const timeoutId = setTimeout(() => {
      cleanup()
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Video frame capture timed out'))
    }, 30000)

    video.onloadedmetadata = () => {
      // Seek to the specified time or 10% of duration
      const targetTime = Math.min(seekTime, video.duration * 0.1, video.duration - 0.1)
      video.currentTime = Math.max(0, targetTime)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Could not get canvas context')
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageUrl = canvas.toDataURL('image/jpeg', 0.9)

        clearTimeout(timeoutId)
        cleanup()
        URL.revokeObjectURL(objectUrl)

        resolve({
          imageUrl,
          width: video.videoWidth,
          height: video.videoHeight
        })
      } catch (err) {
        clearTimeout(timeoutId)
        cleanup()
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
    }

    video.onerror = () => {
      clearTimeout(timeoutId)
      cleanup()
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load video for frame capture'))
    }

    video.src = objectUrl
  })
}

/**
 * Crop a video by capturing a frame, cropping it, and returning the cropped image
 * Note: This returns a cropped thumbnail/preview - full video cropping would require FFmpeg
 */
export async function cropVideoFrame(
  file: File,
  cropArea: CropArea
): Promise<File> {
  // First capture a frame
  const { imageUrl } = await captureVideoFrame(file)

  // Convert data URL to blob
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const frameFile = new File([blob], 'video-frame.jpg', { type: 'image/jpeg' })

  // Crop the frame
  return cropImage(frameFile, cropArea)
}

/**
 * Helper to create image from file for getting dimensions
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}
