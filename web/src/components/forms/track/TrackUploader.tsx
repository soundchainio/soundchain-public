import axios from 'axios';
import { Button } from 'components/Button';
import { ProgressBar } from 'components/ProgressBar';
import { useUpChunk } from 'hooks/useUpChunk';
import { BlueUpload } from 'icons/BlueUpload';
import { Cancel } from 'icons/Cancel';
import { MusicFile } from 'icons/MusicFile';
import { useUploadTrackMutation } from 'lib/graphql';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export interface TrackUploaderProps {
  onSuccess: (trackId: string) => void;
  setAssetUrl: (assetUrl: string) => void;
}

const maxSize = 1024 * 1024 * 30; // 30Mb
const accept = ['audio/*'];

const containerClasses =
  'flex justify-around p-3 bg-black text-gray-30 border-gray-50 border-2 border-dashed rounded-md h-[100px]';

export const TrackUploader = ({ onSuccess, setAssetUrl }: TrackUploaderProps) => {
  const [uploadTrack] = useUploadTrackMutation();
  const [startUpload, { uploading, progress, cancelUpload }] = useUpChunk();
  const [trackId, setTrackId] = useState<string>();
  const [filename, setFilename] = useState<string>();

  const onDrop = async ([file]: File[]) => {
    const { data } = await uploadTrack({ variables: { input: { fileType: file.type } } });

    if (data) {
      axios.put(data.uploadTrack.track.uploadUrl, file, { headers: { 'Content-Type': file.type } });
      startUpload(data.uploadTrack.track.muxUpload.url, file);
      setTrackId(data.uploadTrack.track.id);
      setFilename(file.name);
      if (setAssetUrl) setAssetUrl(data.uploadTrack.track.uploadUrl);
    }
  };
  const { getRootProps, getInputProps } = useDropzone({ maxFiles: 1, maxSize, accept, onDrop });

  useEffect(() => {
    if (!uploading && progress === 100 && trackId) {
      onSuccess(trackId);
    }
  }, [uploading]);

  if (uploading) {
    return (
      <div className={containerClasses}>
        <div>
          <div className="flex space-x-3">
            <MusicFile />
            <div className="flex flex-col justify-center space-y-1">
              <div className="text-white text-xs">{filename}</div>
              <ProgressBar progress={progress || 1} />
            </div>
          </div>
          <div className="flex flex-row space-x-1 items-center mt-1">
            <span className="font-bold text-[12px]">Music uploading...</span>
            {progress && <span className="font-bold text-white text-[11px]">{progress}%</span>}
          </div>
        </div>
        <div className="flex flex-col justify-center flex-shrink-0">
          <Button
            onClick={cancelUpload}
            variant="outline-rounded"
            borderColor="bg-pink-gradient"
            textColor="pink-gradient-text"
            icon={Cancel}
            className="py-.75 px-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className={containerClasses}>
      <div>
        <MusicFile />
        <p className="font-bold text-[12px] mt-1">Upload music...</p>
        <p className="font-semibold text-[9px]">WAV,MP3,AIFF,FLAC,OGA (Max: 30mb)</p>
      </div>
      <div className="flex flex-col justify-center flex-shrink-0">
        <Button
          variant="outline-rounded"
          borderColor="bg-blue-gradient"
          textColor="blue-gradient-text"
          icon={BlueUpload}
          className="py-.75 px-1"
        >
          Choose File
          <input {...getInputProps()} />
        </Button>
      </div>
    </div>
  );
};
