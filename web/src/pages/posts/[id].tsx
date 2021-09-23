import { BottomSheet } from 'components/BottomSheet';
import { BackButton } from 'components/Buttons/BackButton';
import { Comments } from 'components/Comments';
import { Layout } from 'components/Layout';
import { NewCommentForm } from 'components/NewCommentForm';
import { Post } from 'components/Post';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { PostDocument } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useMe } from 'hooks/useMe';
import { InboxButton } from 'components/Buttons/InboxButton';

export interface PostPageProps {
  postId: string;
}

interface PostPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps: GetServerSideProps<PostPageProps, PostPageParams> = async context => {
  const postId = context.params?.id;

  if (!postId) {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);

  const { error } = await apolloClient.query({
    query: PostDocument,
    variables: { id: postId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(PostPage, { postId }, context, apolloClient);
};

export default function PostPage({ postId }: PostPageProps) {
  const me = useMe();

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <Post postId={postId} />
      <div className="pb-12">
        <Comments postId={postId} />
      </div>
      <BottomSheet>
        <NewCommentForm postId={postId} />
      </BottomSheet>
    </Layout>
  );
}
