import { useOnScreen } from 'hooks/useOnScreen';
import React, { useEffect, useRef } from 'react';

interface InfiniteLoaderProps {
  loadMore: () => void;
}

export const InfiniteLoader = ({ loadMore }: InfiniteLoaderProps) => {
  const loaderRef = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(loaderRef);

  useEffect(() => {
    if (isVisible) loadMore();
  });

  return <div ref={loaderRef}>Loading...</div>;
};
