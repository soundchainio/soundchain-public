import NextLink from 'next/link';
import React from 'react';

export const steps = 7;

type Props = {
  href: string;
};

export const SkipButton = ({ href }: Props) => {
  return (
    <NextLink href={href}>
      <a className="bg-gray-30 text-white px-4 py-1 rounded-full text-xs">Skip</a>
    </NextLink>
  );
};
