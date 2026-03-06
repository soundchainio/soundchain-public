import { GetServerSideProps } from 'next'

// GHOST: Redirect /notifications to /dex/notifications (legacy page deprecated)
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dex/notifications',
      permanent: true, // 301 redirect - SEO friendly
    },
  }
}

// This component won't render due to redirect
export default function NotificationsPage() {
  return null
}
