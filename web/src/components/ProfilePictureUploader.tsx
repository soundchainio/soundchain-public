import { Camera } from 'icons/Camera';
import React from 'react';
import { Label } from './Label';

export const ProfilePictureUploader = () => {
  return (
    <div className="flex h-36 items-center justify-center">
      <div className="flex flex-col w-28 h-full items-center justify-center">
        <span className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gray-30">
          <Label className="absolute text-center">
            Profile
            <br />
            Photo
          </Label>
          <div className="relative h-full w-full">
            <Camera className="absolute -bottom-2 -right-2" />
          </div>
        </span>
      </div>
      <div className="w-full h-full max-w-sm flex flex-col items-center justify-center ml-6">
        <span className="inline-flex items-center justify-center h-24 w-full rounded-lg bg-gray-30">
          <Label className="absolute text-centee">Cover Photo</Label>
          <div className="relative h-full w-full">
            <Camera className="absolute -bottom-2 -right-2" />
          </div>
        </span>
      </div>
    </div>
  );
};
