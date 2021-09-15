import { Player } from '@lottiefiles/react-lottie-player';
import React from 'react';

interface LoaderProps {
  loadingMessage: string;
}

export const LoaderAnimation = ({ loadingMessage }: LoaderProps) => {
  return (
    <div className="flex items-center">
      <Player autoplay loop src="/animations/loading-dots.json" className="w-12 h-12" />
      <span className="text-gray-80 text-xs font-bold">{loadingMessage}</span>
    </div>
  );
};
