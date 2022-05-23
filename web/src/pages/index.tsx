import SEO from 'components/SEO';
import type { ReactElement } from 'react';
import LandingPageLayout from '../components/LandingPage/layout';

export default function Index() {
  return (
    <>
      <SEO title='SoundChain' description='SoundChain' canonicalUrl='/' />

      <div className='h-screen w-screen overflow-x-hidden bg-sky-400'>
        <div className='text-white'>Howdy</div>
      </div>
    </>
  );
}

Index.getLayout = (page: ReactElement) => (
  <LandingPageLayout>
    {page}
  </LandingPageLayout>
);