import { PaginateResult } from '../db/pagination/paginate';
import { Post, PostModel } from '../models/Post';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { SortPostInput } from '../types/SortPostInput';
import { Service } from './Service';

interface NewPostParams {
  profileId: string;
  body: string;
  mediaLink?: string;
}

export class PostService extends Service {
  async createPost(params: NewPostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    return post;
  }

  getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    return PostModel.paginate({ filter, sort, page });
  }

  getPost(id: string): Promise<Post> {
    return PostModel.findByIdOrFail(id);
  }
}
