import classNames from 'classnames';
import { useUpload } from 'hooks/useUpload';
import { Camera } from 'icons/Camera';
import Image from 'next/image';
import Dropzone from 'react-dropzone';
import { Label } from './Label';

export interface ImageUploadProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  value?: string;
  onChange(value: string): void;
  roundedFull?: boolean;
}

const defaultMaxFileSize = 1024 * 1024 * 3; // 3Mb
const acceptedMimeTypes = ['image/jpeg', 'image/png'];

export function ImageUpload({
  className,
  maxNumberOfFiles = 1,
  maxFileSize = defaultMaxFileSize,
  value,
  onChange,
  roundedFull,
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
            'relative flex items-center justify-center bg-gray-30',
            roundedFull ? 'rounded-full' : 'rounded-lg',
          )}
          {...rest}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {thumbnail ? (
            <Image
              className={classNames('object-cover', roundedFull ? 'rounded-full' : 'rounded-lg')}
              src={thumbnail}
              alt="Upload preview"
              layout="fill"
            />
          ) : (
            <>
              <Label className="p-4 text-center">{children}</Label>
              <Camera className="absolute -bottom-2 -right-2" />
            </>
          )}
        </div>
      )}
    </Dropzone>
  );
}
