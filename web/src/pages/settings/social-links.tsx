import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/social-links to /dex/settings/social-links (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/social-links',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsSocialLinksPage() {
  return null
}
