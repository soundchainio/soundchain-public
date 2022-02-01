import { BackButton } from 'components/Buttons/BackButton';
import { Inbox } from 'components/Inbox';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import SEO from '../../components/SEO';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(MessagesPage, {}, context, apolloClient);
});

export default function MessagesPage() {
  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
  };

  return (
    <>
      <SEO title="Inbox | SoundChain" canonicalUrl="/messages" description="SoundChain Inbox" />
      <Layout topNavBarProps={topNavBarProps}>
        <Inbox />
      </Layout>
    </>
  );
}
