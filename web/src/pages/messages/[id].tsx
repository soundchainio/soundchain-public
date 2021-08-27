import { BackButton } from 'components/BackButton';
import { BottomSheet } from 'components/BottomSheet';
import { Conversation } from 'components/Conversation';
import { Layout } from 'components/Layout';
import { NewMessageForm } from 'components/NewMessageForm';
import { RefreshButton } from 'components/RefreshButton';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { ConversationDocument, ProfileDocument, ProfileQuery } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';

export interface PostPageProps {
  recipientName: string;
  recipientProfileId: string;
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  const recipientProfileId = context.params?.id as string;

  const { error, data } = await apolloClient.query<ProfileQuery>({
    query: ProfileDocument,
    variables: { id: recipientProfileId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(MessagePage, { recipientName: data.profile.displayName, recipientProfileId }, context, apolloClient);
});

export default function MessagePage({ recipientName, recipientProfileId }: PostPageProps) {
  const topNavBarProps: TopNavBarProps = {
    title: recipientName,
    leftButton: BackButton,
    rightButton: () => RefreshButton({ queryDocument: ConversationDocument }),
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <div className="pb-12">
        <Conversation profileId={recipientProfileId} />
      </div>
      <BottomSheet>
        <NewMessageForm profileId={recipientProfileId} />
      </BottomSheet>
    </Layout>
  );
}
