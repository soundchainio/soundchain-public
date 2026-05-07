import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/bio to /dex/settings/bio (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/settings',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsBioPage() {
  return null
}
