import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings to /dex/settings (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsPage() {
  return null
}
