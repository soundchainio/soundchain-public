import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/profile-picture to /dex/settings/profile-picture (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/profile-picture',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsProfilePicturePage() {
  return null
}
