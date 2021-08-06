import { BottomNavBar } from 'components/BottomNavBar';
import { Post } from 'components/Post';
import { TopNavBar } from 'components/TopNavBar';
import { usePostsQuery } from 'lib/graphql';

export default function Feed() {
  const { loading, error, data } = usePostsQuery();
  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />
      <div className="bg-custom-black-10 flex flex-1 flex-col pt-3 pb-20">
        {loading && <p>Loading...</p>}
        {error && <p>{error.message}</p>}
        <div className="space-y-3">
          {data?.posts.map((post, index) => (
            <Post key={index} body={post.body} name={post.profile.displayName} date={post.createdAt} />
          ))}
        </div>
      </div>
      <BottomNavBar />
    </div>
  );
}
