import { useAudioUpload } from 'hooks/useAudioUpload';
import Dropzone from 'react-dropzone';

export const AudioUpload = () => {
  const [createUpload, { uploading, progress, error, uploadId }] = useAudioUpload();

  return (
    <Dropzone onDrop={createUpload} disabled={uploading}>
      {({ getRootProps, getInputProps }) => (
        <section>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <p className="text-white">
              {!error && !uploading && progress !== 100 && "Drag 'n' drop some files here, or click to select files"}
              {error && error.message}
              {uploading && 'Uploading!'}
              {progress && `${progress}% uploaded...`}
              {progress === 100 && `UploadID: ${uploadId}`}
            </p>
          </div>
        </section>
      )}
    </Dropzone>
  );
};
