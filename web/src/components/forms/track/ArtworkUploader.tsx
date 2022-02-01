import { CameraIcon } from '@heroicons/react/solid';
import { imageMimeTypes, videoMimeTypes } from 'lib/mimeTypes';
import Image from 'next/image';
import { useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

export interface ArtworkUploaderProps {
  name: string;
  onFileChange?: (file: File) => void;
}

const maxSize = 1024 * 1024 * 30; // 30Mb

export const ArtworkUploader = ({ name, onFileChange }: ArtworkUploaderProps) => {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      alert(`${fileRejections[0].file.name} not supported!`);
      return;
    }
    if (!file.name.split('.').pop()) {
      alert(`Could not detect file extension!`);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.addEventListener('loadend', () => {
      setPreview(reader.result as string);
      setFile(file);
      onFileChange && onFileChange(file);
    });
  }

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    maxSize,
    accept: [...imageMimeTypes, ...videoMimeTypes],
    onDrop,
  });

  const isVideo = file?.type.startsWith('video');

  return (
    <div className="flex flex-col cursor-pointer" {...getRootProps()}>
      {!preview && (
        <div className="relative flex border border-gray-35 rounded overflow-hidden">
          <Image src="/soundchain-app-icon.png" alt="Upload preview" width={100} height={100} objectFit="fill" />
          <div className="absolute w-full h-full flex items-center justify-center text-white bg-gray-10 bg-opacity-60">
            <CameraIcon width={30} />
          </div>
        </div>
      )}
      {preview && isVideo && (
        <video
          src={preview}
          loop
          muted
          autoPlay
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          className="w-full h-full"
        />
      )}
      {preview && !isVideo && (
        <div className="relative flex">
          <Image src={preview} alt="Upload preview" width={100} height={100} objectFit="cover" />
        </div>
      )}
      <div className="text-gray-80 text-center font-semibold text-xxs leading-4">CHANGE ARTWORK</div>
      <input name={name} {...getInputProps()} />
    </div>
  );
};
