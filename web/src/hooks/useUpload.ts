import axios from 'axios';
import { apolloClient } from 'lib/apollo';
import { UploadUrlDocument, UploadUrlQuery } from 'lib/graphql';
import { useCallback, useState } from 'react';

export const useUpload = (value?: string, onChange?: (value: string) => void) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);
  const [fileType, setFileType] = useState<string>('');
  const [fileExtension, setFileExtension] = useState<string>('');

  const upload = useCallback(
    async ([file]: File[]) => {
      const objectUrl = URL.createObjectURL(file);
      setUploading(true);
      setPreview(objectUrl);
      setFileType(file.type);

      const fileExt = file.name.split('.').pop();
      if (!fileExt) {
        throw Error('Could not detect file extension!');
      }
      setFileExtension(fileExt);

      const { data } = await apolloClient.query<UploadUrlQuery>({
        query: UploadUrlDocument,
        variables: { fileType: file.type, fileExtension: fileExt },
        fetchPolicy: 'no-cache',
      });

      if (!data) {
        throw Error('Could not get upload URL');
      }

      const { uploadUrl, readUrl } = data.uploadUrl;

      await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } });

      setUploading(false);
      onChange && onChange(readUrl);

      return readUrl;
    },
    [onChange, setPreview, setUploading, setFileType, setFileExtension],
  );

  return { preview, fileType, fileExtension, uploading, upload };
};
