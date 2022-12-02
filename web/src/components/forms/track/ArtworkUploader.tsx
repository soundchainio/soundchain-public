import { Camera } from 'iconsax-react'
import { imageMimeTypes, videoMimeTypes } from 'lib/mimeTypes'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import tw from 'tailwind-styled-components'

export interface ArtworkUploaderProps {
  name: string
  error?: string
  initialValue?: File
  onFileChange: (file: File) => void
}

const maxSize = 1024 * 1024 * 30 // 30Mb

export const ArtworkUploader = ({ name, initialValue, onFileChange, error }: ArtworkUploaderProps) => {
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0].message.replace(`${maxSize.toString()} bytes`, '30mb'))
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
    <div className="flex w-full cursor-pointer flex-col items-center justify-center" {...getRootProps()}>
      <Preview preview={preview} isVideo={isVideo} error={error} />
      {error && <span className="w-24 text-center text-xxs text-red-500">{error}</span>}
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
      <PreviewContainer error={Boolean(error)}>
        <Camera size="30" className="text-neutral-600" />
        <h2 className="text-md font-semibold text-neutral-600">Artwork</h2>
      </PreviewContainer>
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

const PreviewContainer = tw.div<{ error: boolean }>`
  flex
  rounded
  border-2
  border-dashed
  bg-neutral-900
  items-center
  justify-center
  gap-2
  py-8
  px-4
  w-full

  ${({ error }) => (error ? 'border-red-600' : 'border-neutral-600')}
`
