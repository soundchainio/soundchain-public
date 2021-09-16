import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { ImageUploadFileType } from '../types/ImageUploadFileType';
import { ImageUploadUrl } from '../types/ImageUploadUrl';

@Resolver()
export class UploadResolver {
  @Query(() => ImageUploadUrl)
  imageUploadUrl(
    @Ctx() { uploadService }: Context,
    @Arg('fileType', () => ImageUploadFileType) fileType: ImageUploadFileType,
  ): Promise<ImageUploadUrl> {
    return uploadService.generateImageUploadUrl(fileType);
  }
}
