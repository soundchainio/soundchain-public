// import 'services/i18n'

import SEO from 'components/SEO'
import { Discord } from 'icons/social/Discord'
import { Instagram } from 'icons/social/Instagram'
import { Twitter } from 'icons/social/Twitter'
import { YoutubeBW } from 'icons/social/YoutubeBW'
import type { ReactElement } from 'react'
import LandingPageLayout from '../components/pages/LandingPage/layout'

// Landing page doesn't need SSR or authentication data

export default function Index() {
  return (
    <>
      <SEO title="SoundChain" description="SoundChain" canonicalUrl="/" />

      <footer className="mt-4 w-full bg-[#131313] text-[#505050] md:mt-16 lg:mt-12">
        <div className="container mx-auto flex h-[60px] flex-col-reverse items-center justify-center md:flex-row">
          <span className="font-bold">SoundChain. {new Date().getFullYear()} - MADE BY AE.STUDIO</span>
          <div className="flex items-center justify-end gap-3 justify-self-end px-3 lg:ml-3">
            <a href="https://instagram.com/soundchain.io" target="_blank" rel="noreferrer">
              <Instagram width={18} height={18} />
            </a>
            <a href="https://twitter.com/soundchain_io" target="_blank" rel="noreferrer">
              <Twitter width={18} height={18} />
            </a>
            <a href="https://youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ" target="_blank" rel="noreferrer">
              <YoutubeBW width={22} height={22} />
            </a>
            <a href="https://discord.gg/rDxev3QSGg" target="_blank" rel="noreferrer">
              <Discord fill={'#505050'} width={18} height={18} />
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}

Index.getLayout = (page: ReactElement) => <LandingPageLayout>{page}</LandingPageLayout>
