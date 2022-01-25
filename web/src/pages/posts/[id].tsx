import { BottomSheet } from 'components/BottomSheet';
import { BackButton } from 'components/Buttons/BackButton';
import { InboxButton } from 'components/Buttons/InboxButton';
import { Comments } from 'components/Comments';
import { Layout } from 'components/Layout';
import { NewCommentForm } from 'components/NewCommentForm';
import { NotAvailableMessage } from 'components/NotAvailableMessage';
import { Post } from 'components/Post';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { PostDocument, usePostQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';

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
  const { data } = usePostQuery({ variables: { id: postId } });

  const me = useMe();

  if (!data?.post) return null;

  const deleted = data.post.deleted;

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <>
      <SEO
        title="Soundchain - Post"
        canonicalUrl={`/posts/${postId}/`}
        description={data.post.body || 'Soundchain Post Details'}
      />
      <Layout topNavBarProps={topNovaBarProps}>
        {deleted ? (
          <NotAvailableMessage type="post" />
        ) : (
          <div>
            <Post post={data.post} />
            <div className="pb-12">
              <Comments postId={data.post.id} />
            </div>
            <BottomSheet>
              <NewCommentForm postId={data.post.id} />
            </BottomSheet>
          </div>
        )}
      </Layout>
    </>
  );
}
