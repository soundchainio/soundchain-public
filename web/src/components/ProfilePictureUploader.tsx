import { Camera } from 'icons/Camera';
import React, { useState } from 'react';
import { Label } from './Label';
import Dropzone from 'react-dropzone';
import Image from 'next/image';

interface ProfilePictureUploaderProps {
  onProfilePictureSelected: <T extends File>(picture: T) => void;
  onCoverPictureSelected: <T extends File>(picture: T) => void;
}

interface CustomImageLoader {
  src: string;
}

export const ProfilePictureUploader = ({
  onProfilePictureSelected,
  onCoverPictureSelected,
}: ProfilePictureUploaderProps) => {
  const [profilePreview, setProfilePreview] = useState<string>();
  const [coverPreview, setCoverPreview] = useState<string>();

  const onProfile = <T extends File>(pictures: T[]) => {
    const newFile = Object.assign(pictures[0], {
      preview: URL.createObjectURL(pictures[0]),
    });
    setProfilePreview(newFile.preview);
    onProfilePictureSelected(newFile);
  };

  const onCover = <T extends File>(pictures: T[]) => {
    const newFile = Object.assign(pictures[0], {
      preview: URL.createObjectURL(pictures[0]),
    });
    setCoverPreview(newFile.preview);
    onCoverPictureSelected(newFile);
  };

  const customImgLoader = ({ src }: CustomImageLoader) => {
    return `${src}`;
  };

  return (
    <div className="flex h-32 items-center justify-center">
      <Dropzone maxFiles={1} onDrop={onProfile}>
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()} className="flex flex-col w-28 h-full items-center justify-center">
            <span className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gray-30 relative">
              <input {...getInputProps()} />
              {profilePreview ? (
                <Image
                  loader={customImgLoader}
                  alt="Profile picture"
                  src={profilePreview}
                  className="rounded-full object-cover"
                  width="100%"
                  height="100%"
                />
              ) : (
                <>
                  <Label className="absolute text-center">
                    Profile
                    <br />
                    Photo
                  </Label>
                  <div className="relative h-full w-full">
                    <Camera className="absolute -bottom-2 -right-2" />
                  </div>
                </>
              )}
            </span>
          </div>
        )}
      </Dropzone>
      <Dropzone maxFiles={1} onDrop={onCover}>
        {({ getRootProps, getInputProps }) => (
          <div className="w-full h-full max-w-sm flex flex-col items-center justify-center ml-6">
            <span
              {...getRootProps()}
              className="inline-flex items-center justify-center h-24 w-full rounded-lg bg-gray-30 relative"
            >
              <input {...getInputProps()} />
              {coverPreview ? (
                <Image
                  loader={customImgLoader}
                  alt="Cover picture"
                  src={coverPreview}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              ) : (
                <>
                  <Label className="absolute text-centee">Cover Photo</Label>
                  <div className="relative h-full w-full">
                    <Camera className="absolute -bottom-2 -right-2" />
                  </div>
                </>
              )}
            </span>
          </div>
        )}
      </Dropzone>
    </div>
  );
};
