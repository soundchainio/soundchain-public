import { Player } from '@lottiefiles/react-lottie-player';
import React from 'react';

interface LoaderProps {
  loadingMessage?: string;
  ring?: boolean;
}

export const LoaderAnimation = ({ loadingMessage, ring }: LoaderProps) => {
  return (
    <>
      {
        ring ?
          <div className="lds-ring "><div></div><div></div><div></div><div></div></div>
          :
          <div className="flex items-center">
            <Player autoplay loop src="/animations/loading-dots.json" className="w-12 h-12" />
            <span className="text-gray-80 text-xs font-bold">{loadingMessage}</span>
          </div>
      }
    </>
  );
};
