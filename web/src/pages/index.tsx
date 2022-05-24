import SEO from 'components/SEO';
import type { ReactElement } from 'react';
import LandingPageLayout from '../components/LandingPage/layout';

export default function Index() {
  return (
    <>
      <SEO title='SoundChain' description='SoundChain' canonicalUrl='/' />

      <footer className='bg-[#131313] text-[#505050] w-full'>
        <div className='h-[60px] container mx-auto flex items-center justify-center'>
          <span className='font-bold'>SoundChain. {new Date().getFullYear()} - MADE BY AE.STUDIO</span>
        </div>
      </footer>
    </>
  );
}

Index.getLayout = (page: ReactElement) => (
  <LandingPageLayout>
    {page}
  </LandingPageLayout>
);