import jazzicon from '@metamask/jazzicon';
import parse from 'html-react-parser';
import React from 'react';

interface JazziconProps {
  address: string;
  size: number;
}

export const Jazzicon = ({ address, size }: JazziconProps) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const addr = address.slice(2, 10);
  const seed = parseInt(addr, 16);

  const element = jazzicon(size, seed);

  return <div>{parse(element.outerHTML)}</div>;
};
