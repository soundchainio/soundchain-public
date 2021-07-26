import Post, { PostModel } from '../models/Post';

export async function createPost(author: string, body: string): Promise<Post> {
  const post = new PostModel({ author, body });
  await post.save();
  return post;
}

export async function listPosts(): Promise<Post[]> {
  return await PostModel.find().sort({ createdAt: 'desc' }).exec();
}
export async function findPost(id: string): Promise<Post> {
  return await PostModel.findByIdOrFail(id);
}
