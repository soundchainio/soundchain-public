import classNames from 'classnames';
import { useUpload } from 'hooks/useUpload';
import { Upload } from 'icons/Upload';
import Image from 'next/image';
import { useEffect } from 'react';
import Dropzone from 'react-dropzone';
import { imageMimeTypes, videoMimeTypes } from 'utils/mimeTypes';

export interface ImageUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  onChange(value: string): void;
  onUpload?(isUploading: boolean): void;
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  value?: string;
  rounded?: boolean;
  artwork?: boolean;
  initialValue?: File;
}

const defaultMaxFileSize = 1024 * 1024 * 30; // 30Mb
const acceptedMimeTypes = [...imageMimeTypes, ...videoMimeTypes];

export function ImageUpload({
  className,
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  onUpload,
  children,
  rounded,
  initialValue,
  artwork = false,
  ...rest
}: ImageUploadProps) {
  const { preview, fileType, uploading, upload } = useUpload(value, onChange);
  const thumbnail = preview || value;

  useEffect(() => {
    onUpload && onUpload(uploading);
  }, [uploading, onUpload]);

  useEffect(() => {
    initialValue && upload([initialValue]);
  }, [upload, initialValue]);

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
            artwork ? 'w-24 h-24' : 'h-14',
          )}
          {...rest}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {thumbnail ? (
            videoMimeTypes.includes(fileType) ? (
              <video src={thumbnail} loop muted autoPlay controls={false} className="w-full h-full" />
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
