import { ClientOnlyPortal } from 'components/ClientOnlyPortal';
import { Comments } from 'components/Comments';
import { Layout } from 'components/Layout';
import { NewCommentForm } from 'components/NewCommentForm';
import { Post } from 'components/Post';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  return {
    props: { postId: params?.id },
  };
};

export default function PostPage({ postId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <Post postId={postId} />
      <Comments postId={postId} />
      <ClientOnlyPortal selector="#fixed-bottom-stack">
        <NewCommentForm postId={postId} />
      </ClientOnlyPortal>
    </Layout>
  );
}
