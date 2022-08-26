import * as UpChunk from '@mux/upchunk'
import { useMountedState } from './useMountedState'

export const useUpChunk = () => {
  const [uploading, setUploading] = useMountedState(false)
  const [upload, setUpload] = useMountedState<UpChunk.UpChunk | null>(null)
  const [error, setError] = useMountedState<Error | null>(null)
  const [progress, setProgress] = useMountedState<number | null>(null)

  const startUpload = (endpoint: string, file: File) => {
    setUploading(true)

    const upload = UpChunk.createUpload({
      endpoint,
      file,
    })
    setUpload(upload)

    upload.on('error', err => {
      setError(new Error(err.detail))
    })

    upload.on('progress', progress => {
      setProgress(Math.floor(progress.detail))
    })

    upload.on('success', () => {
      setUploading(false)
    })
  }

  const cancelUpload = () => {
    if (!upload) return
    upload.abort()
    setUpload(null)
    setUploading(false)
    setProgress(null)
  }

  return [startUpload, { uploading, error, progress, cancelUpload }] as const
}
