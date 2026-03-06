import { GetServerSideProps } from 'next'

// GHOST: Redirect /settings/favorite-genres to /dex/settings/favorite-genres (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/settings/favorite-genres',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function SettingsFavoriteGenresPage() {
  return null
}
