import classNames from 'classnames';
import { useUpload } from 'hooks/useUpload';
import { Upload } from 'icons/Upload';
import Image from 'next/image';
import Dropzone from 'react-dropzone';

export interface ImageUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  value?: string;
  onChange(value: string): void;
}

const defaultMaxFileSize = 1024 * 1024 * 3; // 3Mb
const acceptedMimeTypes = ['image/jpeg', 'image/png'];

export function ImageUpload({
  className,
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  children,
  ...rest
}: ImageUploadProps) {
  const { preview, uploading, upload } = useUpload(value, onChange);
  const thumbnail = preview || value;

  return (
    <Dropzone
      maxFiles={maxNumberOfFiles}
      maxSize={maxFileSize}
      accept={acceptedMimeTypes}
      onDrop={upload}
      disabled={uploading}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          className={classNames(
            className,
            'relative flex items-center justify-center bg-gray-30 border-gray-80 border-2',
            thumbnail ? 'w-16 h-16 rounded-full' : 'w-3/4 rounded-lg',
          )}
          {...rest}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {thumbnail ? (
            <Image
              className={classNames('object-cover rounded-full')}
              src={thumbnail}
              alt="Upload preview"
              layout="fill"
            />
          ) : (
            <div className="flex flex-row p-4 text-center text-white text-sm font-semibold">
              <Upload className="mr-2 mt-[2px]" />
              {children}
            </div>
          )}
        </div>
      )}
    </Dropzone>
  );
}
