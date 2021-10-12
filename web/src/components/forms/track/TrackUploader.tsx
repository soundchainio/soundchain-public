import { AudioPlayer } from 'components/AudioPlayer';
import { JellyButton } from 'components/Buttons/JellyButton';
import { audioMimeTypes } from 'components/NftCard';
import { ProgressBar } from 'components/ProgressBar';
import { Close as CancelIcon } from 'icons/Close';
import { MusicFile } from 'icons/MusicFile';
import { Upload as UploadIcon } from 'icons/Upload';
import { useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

export interface TrackUploaderProps {
  onFileChange: (file: File) => void;
  cancelUpload: () => void;
  uploading: boolean;
  progress: number | null;
}

const maxSize = 1024 * 1024 * 30; // 30Mb
const accept = audioMimeTypes;

const containerClasses = 'flex bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md gap-4 p-4';

export const TrackUploader = ({ onFileChange, cancelUpload, uploading, progress }: TrackUploaderProps) => {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();

  function onDrop<T extends File>([file]: T[], fileRejections: FileRejection[]) {
    if (fileRejections.length > 0) {
      alert(`${fileRejections[0].file.name} not supported!`);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.addEventListener('loadend', () => {
      setPreview(reader.result as string);
      setFile(file);
      onFileChange(file);
    });
  }

  const { getRootProps, getInputProps } = useDropzone({ maxFiles: 1, maxSize, accept, onDrop });

  if (file && uploading) {
    return (
      <div className={containerClasses}>
        <div>
          <div className="flex space-x-3">
            <MusicFile />
            <div className="flex flex-col justify-center space-y-1">
              <div className="text-white text-xs">{file.name}</div>
              <ProgressBar progress={progress || 1} />
            </div>
          </div>
          <div className="flex flex-row space-x-1 items-center mt-1">
            <span className="font-bold text-[12px]">Music uploading...</span>
            {progress && <span className="font-bold text-white text-[11px]">{progress}%</span>}
          </div>
        </div>
        <div className="flex flex-col justify-center flex-shrink-0">
          <JellyButton
            onClick={cancelUpload}
            flavor="raspberry"
            icon={<CancelIcon activatedColor="red" />}
            className="text-xs"
          >
            Cancel
          </JellyButton>
        </div>
      </div>
    );
  }

  if (file && preview) {
    return (
      <div className="flex flex-col items-center bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md gap-4 p-4 md:flex-row">
        <div className="mr-auto w-full">
          <AudioPlayer title={file.name} src={preview} />
        </div>
        <div className="flex flex-col justify-center flex-shrink-0" {...getRootProps()}>
          <JellyButton
            flavor="blueberry"
            icon={<UploadIcon activatedColor="blue" id="blue-gradient" />}
            className="text-xs"
          >
            Choose File
          </JellyButton>
          <input {...getInputProps()} />
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={containerClasses}>
      <div className="mr-auto w-full">
        <MusicFile />
        <p className="font-bold text-[12px] mt-1">Upload music...</p>
        <p className="font-semibold text-[9px]">WAV,MP3,AIFF,FLAC,OGA (Max: 30mb)</p>
      </div>
      <div className="flex flex-col justify-center flex-shrink-0">
        <JellyButton
          flavor="blueberry"
          icon={<UploadIcon activatedColor="blue" id="blue-gradient" />}
          className="text-xs"
        >
          Choose File
        </JellyButton>
        <input {...getInputProps()} />
      </div>
    </div>
  );
};
