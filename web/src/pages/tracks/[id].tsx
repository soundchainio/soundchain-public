import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

// GHOST: Redirect /tracks/[id] to /dex/track/[id] (legacy page deprecated)
export const getServerSideProps: GetServerSideProps<{}, TrackPageParams> = async context => {
  const trackId = context.params?.id

  if (!trackId) {
    return { notFound: true }
  }

  return {
    redirect: {
      destination: `/dex/track/${trackId}`,
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function TrackPage() {
  return null
}
