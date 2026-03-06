import { useEffect, useMemo } from 'react'

import classNames from 'classnames'
import { useUpload } from 'hooks/useUpload'
import { Upload } from 'icons/Upload'
import { imageMimeTypes, videoMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'
import Dropzone from 'react-dropzone'

// Combined image and video mime types for profile/cover uploads
export const mediaUploadMimeTypes = [
  ...imageMimeTypes,
  // Video types - mp4, mov, webm
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-m4v',
  // Animated images
  'image/gif',
]

export interface ImageUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  onChange(value: string): void
  onUpload?(isUploading: boolean): void
  maxNumberOfFiles?: number
  maxFileSize?: number
  value?: string
  accept?: string[]
  rounded?: 'rounded-full' | 'rounded-lg' | 'rounded-none'
  artwork?: boolean
  initialValue?: File
}

const defaultMaxFileSize = 1024 * 1024 * 30

export function ImageUpload({
  className,
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  onUpload,
  children,
  rounded = 'rounded-lg',
  initialValue,
  artwork = false,
  accept = mediaUploadMimeTypes,
  ...rest
}: ImageUploadProps) {
  const { preview, fileType, uploading, upload } = useUpload(value, onChange)
  const thumbnail = preview || value

  // Convert accept array to Dropzone format
  const dropzoneAccept = useMemo(() => {
    const acceptObj: Record<string, string[]> = {}
    for (const mime of accept) {
      // Map common extensions
      if (mime === 'image/jpeg') acceptObj[mime] = ['.jpg', '.jpeg']
      else if (mime === 'image/png') acceptObj[mime] = ['.png']
      else if (mime === 'image/gif') acceptObj[mime] = ['.gif']
      else if (mime === 'image/webp') acceptObj[mime] = ['.webp']
      else if (mime === 'video/mp4') acceptObj[mime] = ['.mp4']
      else if (mime === 'video/quicktime') acceptObj[mime] = ['.mov']
      else if (mime === 'video/webm') acceptObj[mime] = ['.webm']
      else if (mime === 'video/x-m4v') acceptObj[mime] = ['.m4v']
      else acceptObj[mime] = []
    }
    return acceptObj
  }, [accept])

  useEffect(() => {
    onUpload && onUpload(uploading)
  }, [uploading, onUpload])

  useEffect(() => {
    initialValue && upload([initialValue])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue])

  return (
    <Dropzone
      maxFiles={maxNumberOfFiles}
      multiple={false}
      maxSize={maxFileSize}
      accept={dropzoneAccept}
      onDrop={upload}
      disabled={uploading}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          className={classNames(
            'relative flex items-center justify-center border-2 border-gray-80 bg-gray-30',
            thumbnail,
            rounded,
            artwork ? 'h-24 w-24' : '',
            className,
          )}
          {...rest}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {thumbnail ? (
            fileType.startsWith('video') ? (
              <video src={thumbnail} loop muted autoPlay controls={false} className="h-full w-full" />
            ) : (
              <Image className={classNames('object-cover', rounded)} src={thumbnail} alt="Upload preview" fill />
            )
          ) : (
            <div className="flex flex-row items-baseline justify-center gap-1 p-4 text-sm font-semibold text-white">
              <Upload />
              {children}
            </div>
          )}
        </div>
      )}
    </Dropzone>
  )
}
