import { AudioPlayer } from 'components/AudioPlayer';
import { JellyButton } from 'components/Buttons/JellyButton';
import { MusicFile } from 'icons/MusicFile';
import { Upload as UploadIcon } from 'icons/Upload';
import { audioMimeTypes } from 'lib/mimeTypes';
import { useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

export interface TrackUploaderProps {
  onFileChange: (file: File) => void;
  art?: string;
}

const maxSize = 1024 * 1024 * 100; // 100Mb

const containerClasses = 'flex bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md gap-4 p-4';

export const TrackUploader = ({ onFileChange, art }: TrackUploaderProps) => {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0].message.replace(`${maxSize.toString()} bytes`, '100mb'));
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFile(file);
    onFileChange(file);
  }

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    multiple: false,
    maxSize,
    accept: audioMimeTypes,
    onDrop,
  });

  if (file && preview) {
    return (
      <div
        className="flex flex-col items-center bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md gap-0 md:gap-4 md:flex-row"
      >
        <div className="mr-auto w-full">
          <AudioPlayer title={file.name} src={preview} art={art} />
        </div>
        <div className="flex mb-4 mr-4 flex-col justify-center flex-shrink-0" {...getRootProps()}>
          <JellyButton flavor="blueberry" icon={<UploadIcon color="blue" id="blue-gradient" />} className="text-xs">
            Choose File
          </JellyButton>
          <input {...getInputProps()} />
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={containerClasses}>
      <div className="mr-auto w-full text-gray-80">
        <MusicFile />
        <p className="font-bold text-xs mt-1">Upload music...</p>
        <p className="font-semibold text-xxs">WAV,MP3,AIFF,FLAC,OGA (Max: 100mb)</p>
      </div>
      <div className="flex flex-col justify-center flex-shrink-0">
        <JellyButton flavor="blueberry" icon={<UploadIcon color="blue" id="blue-gradient" />} className="text-xs">
          Choose File
        </JellyButton>
        <input {...getInputProps()} />
      </div>
    </div>
  );
};
