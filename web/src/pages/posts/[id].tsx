import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { NewCommentForm } from '../../components/NewCommentForm';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  // params contains the post `id`.
  // If the route is like /posts/1, then params.id is 1
  // const res = await fetch(`https://.../posts/${params.id}`);
  // const post = await res.json();

  // // Pass post data to the page via props
  // return { props: { post } };
  return { props: { post: {} } };
};

export default function PostPage({ post }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // TODO use post.id and logged in user's profileId
  return <NewCommentForm postId="sdfasdgsd" authorId="60fb0dd8e50376be228186da" />;
}
