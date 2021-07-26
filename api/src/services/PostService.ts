import Post, { PostModel } from '../models/Post';

export class PostService {
  static async createPost(author: string, body: string): Promise<Post> {
    const post = new PostModel({ author, body });
    await post.save();
    return post;
  }
  static async listPosts(): Promise<Post[]> {
    return await PostModel.find().sort({ createdAt: 'desc' }).exec();
  }
  static async findPost(id: string): Promise<Post> {
    return await PostModel.findByIdOrFail(id);
  }
}
