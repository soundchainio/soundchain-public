import axios from 'axios';
import { apolloClient } from 'lib/apollo';
import { UploadUrlDocument, UploadUrlQuery } from 'lib/graphql';
import { useCallback } from 'react';
import { useMountedState } from './useMountedState';

export const useUpload = (value: string | undefined, onChange: (value: string) => void) => {
  const [uploading, setUploading] = useMountedState(false);
  const [preview, setPreview] = useMountedState<string | undefined>(value);
  const [fileType, setFileType] = useMountedState<string>('');

  const upload = useCallback(
    async ([file]: File[]) => {
      const objectUrl = URL.createObjectURL(file);
      setUploading(true);
      setPreview(objectUrl);
      setFileType(file.type);

      const { data } = await apolloClient.query<UploadUrlQuery>({
        query: UploadUrlDocument,
        variables: { fileType: file.type },
        fetchPolicy: 'no-cache',
      });

      if (!data) {
        throw Error('Could not get upload URL');
      }

      const { uploadUrl, readUrl } = data.uploadUrl;

      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

      setUploading(false);
      onChange(readUrl);
    },
    [onChange, setPreview, setUploading, setFileType],
  );

  return { preview, fileType, uploading, upload };
};
