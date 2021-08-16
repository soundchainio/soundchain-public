import { Layout } from 'components/Layout';
import { Post } from 'components/Post';
import { usePostsQuery } from 'lib/graphql';
import Head from 'next/head';

export default function Feed() {
  const { loading, error, data } = usePostsQuery();
  return (
    <Layout>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-gray-10 flex flex-1 flex-col pt-3">
        {loading && <p>Loading...</p>}
        {error && <p>{error.message}</p>}
        <div className="space-y-3">
          {data?.posts.map((post, index) => (
            <Post key={index} postId={post.id} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
