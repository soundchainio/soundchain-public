import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(FeedbackPage, {}, context, apolloClient);
});

export default function FeedbackPage() {
  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Leave Feedback',
  };

  return (
    <Layout topNavBarProps={topNavBarProps} className="mb-0 h-full w-full">
      <Head>
        <title>Soundchain / Feedback</title>
        <meta name="description" content="Feedback" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLScmoMksAwl26GABnutNksgWOlfDGvfZbGeEqAiaSqIHo5sI9g/viewform?embedded=true"
        className="h-full w-full"
        title="Feedback form"
      />
    </Layout>
  );
}
