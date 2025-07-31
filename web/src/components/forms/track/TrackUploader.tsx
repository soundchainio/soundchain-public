import { AudioPlayer } from 'components/AudioPlayer'
import { JellyButton } from 'components/common/Buttons/JellyButton'
import { MusicFile } from 'icons/MusicFile'
import { Upload as UploadIcon } from 'icons/Upload'
import { audioMimeTypes } from 'lib/mimeTypes'
import { useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'
import { toast } from 'react-toastify'

export interface TrackUploaderProps {
  onFileChange: (file: File) => void
  art?: string
}

const maxSize = 1024 * 1024 * 500 // Updated to 500Mb

const containerClasses = 'flex bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md gap-4 p-4'

export const TrackUploader = ({ onFileChange, art }: TrackUploaderProps) => {
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0].message.replace(`${(1024 * 1024 * 500).toString()} bytes`, '500mb'))
      return
    }
    setPreview(URL.createObjectURL(file))
    setFile(file)
    onFileChange(file)
  }

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    multiple: false,
    maxSize: 1024 * 1024 * 500, // Updated to 500Mb
    accept: { 'audio/*': audioMimeTypes, 'video/mp4': ['.mp4'] }, // Adjusted accept type
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
    <div {...getRootProps()} className={containerClasses}>
      <div className="mr-auto w-full text-gray-80">
        <MusicFile />
        <p className="mt-1 text-xs font-bold">Upload music or video...</p>
        <p className="text-xxs font-semibold">WAV,MP3,AIFF,FLAC,OGA,MP4 (Max: 500mb)</p> // Updated to include MP4 and 500mb
      </div>
      <div className="flex flex-shrink-0 flex-col justify-center">
        <JellyButton flavor="blueberry" icon={<UploadIcon color="blue" id="blue-gradient" />} className="text-xs">
          Choose File
        </JellyButton>
        <input {...getInputProps()} />
      </div>
    </div>
  )
}
