import * as UpChunk from '@mux/upchunk';
import { useMountedState } from './useMountedState';

export const useUpChunk = () => {
  const [uploading, setUploading] = useMountedState(false);
  const [error, setError] = useMountedState<Error | null>(null);
  const [progress, setProgress] = useMountedState<number | null>(null);

  const upload = (endpoint: string, file: File) => {
    setUploading(true);

    const upload = UpChunk.createUpload({
      endpoint,
      file,
    });

    upload.on('error', err => {
      setError(new Error(err.detail));
    });

    upload.on('progress', progress => {
      setProgress(Math.floor(progress.detail));
    });

    upload.on('success', () => {
      setUploading(false);
    });
  };

  return [upload, { uploading, error, progress }] as const;
};
