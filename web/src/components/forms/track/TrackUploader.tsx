import { AudioPlayer } from 'components/AudioPlayer'
import { JellyButton } from 'components/common/Buttons/JellyButton'
import { MusicFile } from 'icons/MusicFile'
import { Upload as UploadIcon } from 'icons/Upload'
import { MusicSquareAdd } from 'iconsax-react'
import { audioMimeTypes } from 'lib/mimeTypes'
import { useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'
import tw from 'tailwind-styled-components'

export interface TrackUploaderProps {
  onFileChange: (file: File) => void
  art?: string
}

const maxSize = 1024 * 1024 * 100 // 100Mb

export const TrackUploader = ({ onFileChange, art }: TrackUploaderProps) => {
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0].message.replace(`${maxSize.toString()} bytes`, '100mb'))
      return
    }
    setPreview(URL.createObjectURL(file))
    setFile(file)
    onFileChange(file)
  }

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    multiple: false,
    maxSize,
    accept: audioMimeTypes,
    onDrop,
  })

  if (file && preview) {
    return (
      <div className="flex flex-col items-center gap-0 rounded-md border-2 border-dashed border-gray-50 bg-black text-gray-30 md:flex-row md:gap-4">
        <div className="mr-auto w-full">
          <AudioPlayer title={file.name} src={preview} art={art} />
        </div>
        <div className="mb-4 mr-4 flex flex-shrink-0 flex-col justify-center" {...getRootProps()}>
          <JellyButton flavor="blueberry" icon={<UploadIcon color="blue" id="blue-gradient" />} className="text-xs">
            Choose File
          </JellyButton>
          <input {...getInputProps()} />
        </div>
      </div>
    )
  }

  return (
    <Container {...getRootProps()}>
      <MusicSquareAdd size="30" />
      <div className="flex flex-col items-start">
        <Paragraph>Track</Paragraph>
        <Paragraph className="text-sm font-normal">WAV,MP3,AIFF,FLAC,OGA (Max: 100mb)</Paragraph>
      </div>
      <input {...getInputProps()} />
    </Container>
  )
}

const Container = tw.div`
  bg-neutral-900
  text-neutral-600
  border-neutral-600
  rounded
  border-2
  border-dashed
  py-8
  px-4
  flex
  gap-2
  items-center
  w-full
`
const Paragraph = tw.div`
  font-semibold
  text-md
`
