import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';

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
      <SEO title="Soundchain - Feedback" description="Give your feedback" canonicalUrl="/feedback/" />
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLScmoMksAwl26GABnutNksgWOlfDGvfZbGeEqAiaSqIHo5sI9g/viewform?embedded=true"
        className="h-full w-full"
        title="Feedback form"
      />
    </Layout>
  );
}
