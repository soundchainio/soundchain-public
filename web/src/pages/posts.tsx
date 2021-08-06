import { LockedLayout } from 'components/LockedLayout';
import { Title } from 'components/Title';
import Head from 'next/head';
import { PostInput } from '../components/PostInput';

export default function PostsPage() {
  return (
    <div>
      <Head>
        <title>Soundchain - New Post</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LockedLayout>
        <Title className="my-6">Create a new post</Title>
        <PostInput />
      </LockedLayout>
    </div>
  );
}
