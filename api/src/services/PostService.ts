import Post, { PostModel } from '../models/Post';

export class PostService {
  static async createPost(profileId: string, body: string): Promise<Post> {
    const post = new PostModel({ profileId, body });
    await post.save();
    return post;
  }

  static getPosts(): Promise<Post[]> {
    return PostModel.find().sort({ createdAt: 'desc' }).limit(50).exec();
  }

  static getPost(id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }
}
