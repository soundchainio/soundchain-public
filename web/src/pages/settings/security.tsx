import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/security to /dex/settings/security (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/security',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsSecurityPage() {
  return null
}
