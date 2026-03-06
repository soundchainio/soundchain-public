import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/musician-type to /dex/settings/musician-type (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/musician-type',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsMusicianTypePage() {
  return null
}
