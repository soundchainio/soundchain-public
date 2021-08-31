import isBrowser from 'lib/isBrowser';
import { RefObject, useEffect, useState } from 'react';

export const useOnScreen = (ref: RefObject<Element>) => {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    observer.observe(ref.current as Element);
    return () => {
      observer.disconnect();
    };
  }, []);
  if (!isBrowser) return false;
  const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting));
  return isIntersecting;
};
