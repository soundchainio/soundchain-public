import { BottomSheet } from 'components/BottomSheet';
import { BackButton } from 'components/Buttons/BackButton';
import { RefreshButton } from 'components/Buttons/RefreshButton';
import { Chat } from 'components/Chat';
import { LayoutMenu } from 'components/LayoutMenu';
import { NewMessageForm } from 'components/NewMessageForm';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { ChatHistoryDocument, ProfileDisplayNameDocument, ProfileDisplayNameQuery } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';

export interface PostPageProps {
  recipientName: string;
  recipientProfileId: string;
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  const recipientProfileId = context.params?.id as string;

  try {
    const { data } = await apolloClient.query<ProfileDisplayNameQuery>({
      query: ProfileDisplayNameDocument,
      variables: { id: recipientProfileId },
      context,
    });
    return cacheFor(ChatPage, { recipientName: data.profile.displayName, recipientProfileId }, context, apolloClient);
  } catch (error) {
    return { notFound: true };
  }
});

export default function ChatPage({ recipientName, recipientProfileId }: PostPageProps) {
  const topNavBarProps: TopNavBarProps = {
    title: recipientName,
    leftButton: BackButton,
    rightButton: () => RefreshButton({ queryDocument: ChatHistoryDocument }),
  };

  return (
    <LayoutMenu topNavBarProps={topNavBarProps} hideBottomNavBar>
      <div>
        <Chat profileId={recipientProfileId} />
      </div>
      <BottomSheet>
        <NewMessageForm profileId={recipientProfileId} />
      </BottomSheet>
    </LayoutMenu>
  );
}
