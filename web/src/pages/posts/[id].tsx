import { Layout } from 'components/Layout';
import { Post } from 'components/Post';
import { useRouter } from 'next/router';

// export const getServerSideProps: GetServerSideProps = async context => {
//   const { data: post } = await apolloClient.query<PostQuery>({
//     query: PostDocument,
//     variables: { id: context.params?.id },
//     context,
//   });
//   return { props: { post } };
// };

export default function PostPage() {
  const router = useRouter();

  return (
    <Layout>
      <Post id={router.query.id as string} />
    </Layout>
  );
}
