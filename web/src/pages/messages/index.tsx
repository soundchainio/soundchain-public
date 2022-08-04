import { BackButton } from 'components/Buttons/BackButton';
import { Inbox } from 'components/Inbox';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import { useEffect } from 'react';
import SEO from '../../components/SEO';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(MessagesPage, {}, context, apolloClient);
});

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
};

export default function MessagesPage() {
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  return (
    <>
      <SEO title="Inbox | SoundChain" canonicalUrl="/messages" description="SoundChain Inbox" />
      <Inbox />
    </>
  );
}
