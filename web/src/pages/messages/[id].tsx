import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'

interface MessagePageParams extends ParsedUrlQuery {
  id: string
}

// GHOST: Redirect /messages/[id] to /dex/messages/[id] (legacy page deprecated)
export const getServerSideProps: GetServerSideProps<{}, MessagePageParams> = async context => {
  const profileId = context.params?.id

  if (!profileId) {
    return { notFound: true }
  }

  return {
    redirect: {
      destination: `/dex/messages/${profileId}`,
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function ChatPage() {
  return null
}
