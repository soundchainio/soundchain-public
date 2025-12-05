import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'

interface ProfilePageParams extends ParsedUrlQuery {
  handle: string
}

// GHOST: Redirect /profiles/[handle] to /dex/profile/[handle] (legacy page deprecated)
export const getServerSideProps: GetServerSideProps<{}, ProfilePageParams> = async context => {
  const handle = context.params?.handle

  if (!handle) {
    return { notFound: true }
  }

  return {
    redirect: {
      destination: `/dex/profile/${handle}`,
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function ProfilePage() {
  return null
}
