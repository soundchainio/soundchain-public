import Post, { PostModel } from '../models/Post';

export class PostService {
  static async createPost(profileId: string, body: string): Promise<Post> {
    const post = new PostModel({ profileId, body });
    await post.save();
    return post;
  }

  static async getPosts(): Promise<Post[]> {
    return await PostModel.find().sort({ createdAt: 'desc' }).exec();
  }

  static async getPost(id: string): Promise<Post> {
    return await PostModel.findByIdOrFail(id);
  }
}
