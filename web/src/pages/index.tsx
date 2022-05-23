import SEO from 'components/SEO';
import type { ReactElement } from 'react';
import LandingPageLayout from '../components/LandingPage/layout';

export default function Index() {
  return (
    <>
      <SEO title='SoundChain' description='SoundChain' canonicalUrl='/' />
    </>
  );
}

Index.getLayout = (page: ReactElement) => (
  <LandingPageLayout>
    {page}
  </LandingPageLayout>
);