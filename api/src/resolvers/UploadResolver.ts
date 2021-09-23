import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { UploadFileType } from '../types/UploadFileType';
import { UploadUrl } from '../types/UploadUrl';

@Resolver()
export class UploadResolver {
  @Query(() => UploadUrl)
  @Authorized()
  uploadUrl(
    @Ctx() { uploadService }: Context,
    @Arg('fileType', () => UploadFileType) fileType: UploadFileType,
  ): Promise<UploadUrl> {
    return uploadService.generateUploadUrl(fileType);
  }
}
