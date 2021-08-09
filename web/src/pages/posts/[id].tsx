import { Layout } from 'components/Layout';
import { NewCommentForm } from 'components/NewCommentForm';
import { apolloClient } from 'lib/apollo';
import { PostDocument, PostQuery } from 'lib/graphql';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const { data: post } = await apolloClient.query<PostQuery>({ query: PostDocument, variables: { id: params?.id } });
  return { props: { post } };
};

export default function PostPage({ post }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <div>{post.body}</div>
      <NewCommentForm post={post.id} />
    </Layout>
  );
}
