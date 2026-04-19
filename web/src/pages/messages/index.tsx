import { GetServerSideProps } from 'next'

// GHOST: Redirect /messages to /messages (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/messages',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function MessagesPage() {
  return null
}
