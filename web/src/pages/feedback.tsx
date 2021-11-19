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
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <iframe
        src="https://docs.google.com/forms/d/1r-P7fbvspXlBzy3khDUXOHsmMdxObo6ITlqRRP9dTo8/viewform?edit_requested=true"
        className="h-full w-full"
      />
    </Layout>
  );
}
