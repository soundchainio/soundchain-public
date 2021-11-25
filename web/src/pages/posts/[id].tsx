import { BottomSheet } from 'components/BottomSheet';
import { BackButton } from 'components/Buttons/BackButton';
import { InboxButton } from 'components/Buttons/InboxButton';
import { Comments } from 'components/Comments';
import { Layout } from 'components/Layout';
import { NewCommentForm } from 'components/NewCommentForm';
import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { Post } from 'components/Post';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { PostDocument, PostQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';

export interface PostPageProps {
  post: PostQuery['post'];
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

  const { data, error } = await apolloClient.query({
    query: PostDocument,
    variables: { id: postId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(PostPage, { post: data.post }, context, apolloClient);
};

export default function PostPage({ post }: PostPageProps) {
  const me = useMe();
  const deleted = post.deleted;

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      {deleted ? (
        <NotAvailableMessage type="post" />
      ) : (
        <div>
          <Post post={post} />
          <div className="pb-12">
            <Comments postId={post.id} />
          </div>
          <BottomSheet>
            <NewCommentForm postId={post.id} />
          </BottomSheet>
        </div>
      )}
    </Layout>
  );
}
