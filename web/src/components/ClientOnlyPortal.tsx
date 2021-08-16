import { ReactChild, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ClientOnlyPortalProps {
  children: ReactChild | ReactChild[];
  selector: string;
}

export const ClientOnlyPortal = ({ children, selector }: ClientOnlyPortalProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ref.current = document.querySelector(selector);
    setMounted(true);
  }, [selector]);

  return ref.current && mounted ? createPortal(children, ref.current) : null;
};
