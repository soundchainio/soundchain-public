import { useUpChunk } from 'hooks/useUpChunk';
import { useUploadTrackMutation } from 'lib/graphql';
import Dropzone from 'react-dropzone';

export const AudioUpload = () => {
  const [uploadTrack] = useUploadTrackMutation();
  const [upload, { uploading, progress, error }] = useUpChunk();
  const handleDrop = async ([file]: File[]) => {
    const { data } = await uploadTrack();

    if (data) {
      upload(data.uploadTrack.track.upload.url, file);
    }
  };

  return (
    <Dropzone onDrop={handleDrop} disabled={uploading}>
      {({ getRootProps, getInputProps }) => (
        <section>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <p className="text-white">
              {!error && !uploading && progress !== 100 && "Drag 'n' drop some files here, or click to select files"}
              {error && error.message}
              {uploading && 'Uploading!'}
              {progress && `${progress}% uploaded...`}
            </p>
          </div>
        </section>
      )}
    </Dropzone>
  );
};
