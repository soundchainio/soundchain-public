import { CameraIcon } from '@heroicons/react/24/solid' // Updated to 24/solid for consistency
import { imageMimeTypes, videoMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'

export interface ArtworkUploaderProps {
  name: string
  error?: string
  initialValue?: File
  onFileChange: (file: File) => void
}

const maxSize = 1024 * 1024 * 150 // Updated to 150MB

export const ArtworkUploader = ({ name, initialValue, onFileChange, error }: ArtworkUploaderProps) => {
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0].message.replace(`${maxSize.toString()} bytes`, '150mb'))
      return
    }
    setPreview(URL.createObjectURL(file))
    setFile(file)
    onFileChange(file)
  }

  useEffect(() => {
    if (initialValue) {
      onDrop([initialValue], [])
    } else {
      setFile(undefined)
      setPreview(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue])

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    multiple: false,
    maxSize,
    accept: [...imageMimeTypes, ...videoMimeTypes],
    onDrop,
  })

  const isVideo = file?.type.startsWith('video')

  return (
    <div className="flex cursor-pointer flex-col" {...getRootProps()}>
      <Preview preview={preview} isVideo={isVideo} error={error} />
      {error && <span className="w-24 text-center text-xxs text-red-500">{error}</span>}
      <div className="text-center text-xxs font-semibold leading-4 text-gray-80">CHANGE ARTWORK</div>
      <input name={name} {...getInputProps()} />
    </div>
  )
}

interface PreviewProps {
  preview: string | undefined
  isVideo: boolean | undefined
  error?: string
}

const Preview = ({ preview, isVideo, error }: PreviewProps) => {
  if (!preview) {
    return (
      <div className={`relative flex overflow-hidden rounded border ${error ? 'border-red-500' : 'border-gray-35'}`}>
        <Image src="/soundchain-app-icon.png" alt="Upload preview" width={100} height={100} objectFit="fill" />
        <div className="absolute flex h-full w-full items-center justify-center bg-gray-10 bg-opacity-60 text-white">
          <CameraIcon width={30} />
        </div>
      </div>
    )
  }
  if (isVideo) {
    return (
      <video
        src={preview}
        loop
        muted
        autoPlay
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        className="h-[100px] w-[100px] object-cover"
      />
    )
  }
  return (
    <div className="relative flex">
      <Image src={preview} alt="Upload preview" width={100} height={100} objectFit="cover" />
    </div>
  )
}
