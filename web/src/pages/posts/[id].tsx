import { BottomSheet } from 'components/BottomSheet';
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
      <div className="pb-12">
        <Comments postId={postId} />
      </div>
      <BottomSheet>
        <NewCommentForm postId={postId} />
      </BottomSheet>
    </Layout>
  );
}
