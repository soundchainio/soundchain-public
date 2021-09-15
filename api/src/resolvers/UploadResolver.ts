import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { AudioUpload } from '../types/AudioUpload';
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

  @Query(() => AudioUpload)
  @Authorized()
  audioUpload(@Ctx() { uploadService }: Context): Promise<AudioUpload> {
    return uploadService.createAudioUpload();
  }
}
