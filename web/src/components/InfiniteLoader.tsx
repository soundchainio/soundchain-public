import { useOnScreen } from 'hooks/useOnScreen';
import React, { useEffect, useRef } from 'react';
import { LoaderAnimation } from './LoaderAnimation';

interface InfiniteLoaderProps {
  loadMore: () => void;
  loadingMessage: string;
}

export const InfiniteLoader = ({ loadMore, loadingMessage }: InfiniteLoaderProps) => {
  const loaderRef = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(loaderRef);

  useEffect(() => {
    if (isVisible) {
      loadMore();
    }
  }, [isVisible]);

  return (
    <div ref={loaderRef}>
      <LoaderAnimation loadingMessage={loadingMessage} />
    </div>
  );
};
