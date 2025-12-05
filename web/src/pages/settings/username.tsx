import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/username to /dex/settings/username (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/username',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsUsernamePage() {
  return null
}
