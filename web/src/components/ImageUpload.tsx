import classNames from 'classnames';
import { useUpload } from 'hooks/useUpload';
import { Upload } from 'icons/Upload';
import { imageMimeTypes } from 'lib/mimeTypes';
import Image from 'next/image';
import { useEffect } from 'react';
import Dropzone from 'react-dropzone';

export interface ImageUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  onChange(value: string): void;
  onUpload?(isUploading: boolean): void;
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  value?: string;
  accept?: string[];
  rounded?: 'rounded-full' | 'rounded-lg' | 'rounded-none';
  artwork?: boolean;
  initialValue?: File;
}

const defaultMaxFileSize = 1024 * 1024 * 30;

export function ImageUpload({
  className,
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  onUpload,
  children,
  rounded = 'rounded-lg',
  initialValue,
  artwork = false,
  accept = imageMimeTypes,
  ...rest
}: ImageUploadProps) {
  const { preview, fileType, uploading, upload } = useUpload(value, onChange);
  const thumbnail = preview || value;

  useEffect(() => {
    onUpload && onUpload(uploading);
  }, [uploading, onUpload]);

  useEffect(() => {
    initialValue && upload([initialValue]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  return (
    <Dropzone
      maxFiles={maxNumberOfFiles}
      multiple={false}
      maxSize={maxFileSize}
      accept={accept}
      onDrop={upload}
      disabled={uploading}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          className={classNames(
            'relative flex items-center justify-center bg-gray-30 border-gray-80 border-2',
            thumbnail,
            rounded,
            artwork ? 'w-24 h-24' : '',
            className,
          )}
          {...rest}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {thumbnail ? (
            fileType.startsWith('video') ? (
              <video src={thumbnail} loop muted autoPlay controls={false} className="w-full h-full" />
            ) : (
              <Image
                className={classNames('object-cover', rounded)}
                src={thumbnail}
                alt="Upload preview"
                layout="fill"
              />
            )
          ) : (
            <div className="flex flex-row gap-1 items-baseline justify-center p-4 text-white text-sm font-semibold">
              <Upload />
              {children}
            </div>
          )}
        </div>
      )}
    </Dropzone>
  );
}
