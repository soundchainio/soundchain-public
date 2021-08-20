import { isUndefined, omitBy } from 'lodash';
import { Post, PostModel } from '../models/Post';

interface NewPostParams {
  profileId: string;
  body: string;
  mediaLink?: string;
}

interface GetPostsFilters {
  profileId?: string;
}

export class PostService {
  static async createPost(params: NewPostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    return post;
  }

  static getPosts(filters: GetPostsFilters): Promise<Post[]> {
    return PostModel.find(omitBy(filters, isUndefined)).sort({ createdAt: 'desc' }).exec();
  }

  static getPost(id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }
}
