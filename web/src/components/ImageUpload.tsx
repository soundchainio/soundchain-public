import { useEffect } from 'react'

import classNames from 'classnames'
import { useUpload } from 'hooks/useUpload'
import { Upload } from 'icons/Upload'
import { imageMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'
import Dropzone from 'react-dropzone'

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
  accept = imageMimeTypes,
  ...rest
}: ImageUploadProps) {
  const { preview, fileType, uploading, upload } = useUpload(value, onChange)
  const thumbnail = preview || value

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
      accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }}
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
