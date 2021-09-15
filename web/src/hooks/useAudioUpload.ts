import { useApolloClient } from '@apollo/client';
import * as UpChunk from '@mux/upchunk';
import { AudioUploadDocument, AudioUploadQuery } from 'lib/graphql';
import { useMountedState } from './useMountedState';

export const useAudioUpload = () => {
  const [uploading, setUploading] = useMountedState(false);
  const [error, setError] = useMountedState<Error | null>(null);
  const [progress, setProgress] = useMountedState<number | null>(null);
  const [uploadId, setUploadId] = useMountedState<string | null>(null);
  const apolloClient = useApolloClient();

  const createUpload = ([file]: File[]) => {
    setUploading(true);

    const upload = UpChunk.createUpload({
      endpoint: async () => {
        const { data } = await apolloClient.query<AudioUploadQuery>({
          query: AudioUploadDocument,
          fetchPolicy: 'no-cache',
        });

        if (!data) {
          const err = new Error('Error creating upload');
          setError(err);
          throw err;
        }

        const { id, url } = data.audioUpload;

        setUploadId(id);
        return url;
      },
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

  return [createUpload, { uploading, error, progress, uploadId }] as const;
};
