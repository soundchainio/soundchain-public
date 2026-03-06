import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/cover-picture to /dex/settings/cover-picture (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/cover-picture',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsCoverPicturePage() {
  return null
}
