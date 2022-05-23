import { ReactNode } from 'react';
import { Section1 } from './section1';
import { Section2 } from './section2';
import { Section3 } from './section3';
import { Section4 } from './section4';
import { Section5 } from './section5';

export interface LayoutProps {
  children: ReactNode | undefined;
}

export default function LandingPageLayout({ children }: LayoutProps) {
  return (
    <div className='relative h-full flex flex-col text-white overflow-x-hidden font-rubik'>
      <Section1 />
      <Section2 />
      <Section3 />
      <Section4 />
      <Section5 />

      {children}
    </div>
  );
}