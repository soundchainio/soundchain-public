import { Ref } from '@typegoose/typegoose';
import { Post, PostModel } from 'models/Post';

interface NewPostParams {
  profileId: string;
  body: string;
}

export class PostService {
  static async createPost(params: NewPostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    return post;
  }

  static getPosts(limit: number, skip: number): Promise<Post[]> {
    return PostModel.find().sort({ createdAt: 'desc' }).limit(limit).skip(skip).exec();
  }

  static getPost(id: string | Ref<Post>): Promise<Post> {
    return PostModel.findByIdOrFail(id as string);
  }
}
