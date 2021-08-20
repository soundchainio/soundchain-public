import { PaginateResult } from '../db/pagination/paginate';
import { Post, PostModel } from '../models/Post';
import { FilterPostInput } from '../resolvers/types/FilterPostInput';
import { PageInput } from '../resolvers/types/PageInput';
import { SortPostInput } from '../resolvers/types/SortPostInput';

interface NewPostParams {
  profileId: string;
  body: string;
  mediaLink?: string;
  repostId?: string;
}

export class PostService {
  static async createPost(params: NewPostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    return post;
  }

  static getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    return PostModel.paginate({ filter, sort, page });
  }

  static getPost(id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }
}
