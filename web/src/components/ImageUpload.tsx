import classNames from 'classnames';
import { useUpload } from 'hooks/useUpload';
import { Upload } from 'icons/Upload';
import Image from 'next/image';
import Dropzone from 'react-dropzone';
import { videoMimeTypes } from './NftCard';

export interface ImageUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  value?: string;
  onChange(value: string): void;
  rounded?: boolean;
  artwork?: boolean;
}

const defaultMaxFileSize = 1024 * 1024 * 100; // 100Mb
const acceptedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', ...videoMimeTypes];

export function ImageUpload({
  className,
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  children,
  rounded,
  artwork = false,
  ...rest
}: ImageUploadProps) {
  const { preview, fileType, uploading, upload } = useUpload(value, onChange);
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
            'relative flex items-center justify-center bg-gray-30 border-gray-80 border-2',
            thumbnail && rounded ? 'rounded-full' : 'rounded-lg',
            className,
            artwork ? 'w-20 h-20' : 'h-14',
          )}
          {...rest}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {thumbnail ? (
            videoMimeTypes.includes(fileType) ? (
              <video src={thumbnail} loop muted autoPlay className="w-full h-full" />
            ) : (
              <Image
                className={classNames('object-cover', rounded ? 'rounded-full' : 'rounded-lg')}
                src={thumbnail}
                alt="Upload preview"
                layout="fill"
              />
            )
          ) : (
            <div className="flex flex-row p-4 text-center text-white text-sm font-semibold">
              <Upload />
              {children}
            </div>
          )}
        </div>
      )}
    </Dropzone>
  );
}
