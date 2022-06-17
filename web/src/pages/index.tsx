import SEO from 'components/SEO';
import { Discord } from 'icons/social/Discord';
import { Instagram } from 'icons/social/Instagram';
import { Twitter } from 'icons/social/Twitter';
import { YoutubeBW } from 'icons/social/YoutubeBW';
import type { ReactElement } from 'react';
import LandingPageLayout from '../components/LandingPage/layout';

export default function Index() {
  return (
    <>
      <SEO title='SoundChain' description='SoundChain' canonicalUrl='/' />

      <footer className='bg-[#131313] text-[#505050] w-full mt-4 md:mt-16 lg:mt-12'>
        <div className='h-[60px] container mx-auto flex flex-col-reverse md:flex-row items-center justify-center'>
          <span className='font-bold'>SoundChain. {new Date().getFullYear()} - MADE BY AE.STUDIO</span>
          <div className='flex items-center justify-end gap-3 px-3 justify-self-end lg:ml-3'>
            <a  href='https://instagram.com/soundchain.io' target="_blank" rel="noreferrer">
              <Instagram width={18} height={18} />
            </a>
            <a  href='https://twitter.com/soundchain_io' target="_blank" rel="noreferrer">
              <Twitter width={18} height={18} />
            </a>
            <a  href='https://youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ' target="_blank" rel="noreferrer">
              <YoutubeBW width={22} height={22} />
            </a>
            <a href='https://discord.gg/rDxev3QSGg' target="_blank" rel="noreferrer">
              <Discord fill={'#505050'} width={18} height={18} />
            </a>
          </div>
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