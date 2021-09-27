import { useUpload } from 'hooks/useUpload';
import { Upload } from 'icons/Upload';
import Dropzone from 'react-dropzone';

export interface AssetUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  value?: string;
  onChange(value: string): void;
  rounded?: boolean;
}

const defaultMaxFileSize = 1024 * 1024 * 100; // 100Mb
const acceptedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg'];

export function AssetUpload({
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  children,
}: AssetUploadProps) {
  const { uploading, upload } = useUpload(value, onChange);

  return (
    <Dropzone
      maxFiles={maxNumberOfFiles}
      maxSize={maxFileSize}
      accept={acceptedMimeTypes}
      onDrop={upload}
      disabled={uploading}
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <div className="flex flex-row p-4 text-center text-white text-sm font-semibold cursor-pointer">
            <Upload className="mr-2 mt-[2px]" />
            {uploading ? 'Uploading...' : children}
          </div>
        </div>
      )}
    </Dropzone>
  );
}
