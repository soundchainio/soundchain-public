import { Button } from 'components/Button';
import { useField } from 'formik';
import { useUpload } from 'hooks/useUpload';
import { MusicFile } from 'icons/MusicFile';
import { Upload } from 'icons/Upload';
import { useDropzone } from 'react-dropzone';

export interface AudioUploadFieldProps {
  name: string;
  maxFiles?: number;
  maxSize?: number;
}

const defaultMaxFileSize = 1024 * 1024 * 100; // 100Mb
const accept = ['audio/*'];

export const AudioUploadField = ({ name, maxFiles = 1, maxSize = defaultMaxFileSize }: AudioUploadFieldProps) => {
  const [{ value }, , { setValue }] = useField(name);
  const { uploading, upload } = useUpload(value, setValue);
  const { getRootProps, getInputProps } = useDropzone({ maxFiles, maxSize, accept, onDrop: upload });

  return (
    <div
      {...getRootProps()}
      className={'flex p-3 bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md min-h-[100px]'}
    >
      <div className="">
        <MusicFile />
        <p className="font-bold text-sm mt-1">Upload music...</p>
        <p className="font-semibold text-xs">WAV,MP3,AIFF,FLAC,OGA (Max: 30mb)</p>
      </div>
      <div className="flex flex-col justify-center flex-shrink-0">
        <Button
          variant="outline-rounded"
          borderColor="bg-blue-gradient"
          textColor="blue-gradient-text"
          icon={Upload}
          className="p-1"
        >
          Choose File
          <input {...getInputProps()} />
        </Button>
      </div>
    </div>
  );
};
