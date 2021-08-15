import axios from 'axios';
import { useGenerateUploadUrlMutation } from 'lib/graphql';
import { useCallback } from 'react';
import { useMountedState } from './useMountedState';

export const useUpload = (value: string | undefined, onChange: (value: string) => void) => {
  const [uploading, setUploading] = useMountedState(false);
  const [preview, setPreview] = useMountedState<string | undefined>(value);
  const [getUploadUrl] = useGenerateUploadUrlMutation();

  const upload = useCallback(
    async ([file]: File[]) => {
      const objectUrl = URL.createObjectURL(file);
      setUploading(true);
      setPreview(objectUrl);

      const { data } = await getUploadUrl({ variables: { input: { fileType: file.type } } });

      if (!data) {
        throw Error('Could not get upload URL');
      }

      const { uploadUrl, readUrl } = data.generateUploadUrl;

      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

      setUploading(false);
      onChange(readUrl);
    },
    [getUploadUrl, onChange, setPreview, setUploading],
  );

  return { preview, uploading, upload };
};
