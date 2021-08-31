import { Player } from '@lottiefiles/react-lottie-player';
import { useOnScreen } from 'hooks/useOnScreen';
import React, { useEffect, useRef } from 'react';

interface InfiniteLoaderProps {
  loadMore: () => void;
  loadingMessage: string;
}

export const InfiniteLoader = ({ loadMore, loadingMessage }: InfiniteLoaderProps) => {
  const loaderRef = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(loaderRef);

  useEffect(() => {
    if (isVisible) loadMore();
  });

  return (
    <div ref={loaderRef} className="flex items-center">
      <Player autoplay loop src="/animations/loading-dots.json" className="w-12 h-12" />
      <span className="text-gray-80 text-xs font-bold">{loadingMessage}</span>
    </div>
  );
};
