import axios from 'axios';
import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { MimeType } from '../types/MimeType';
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

  @Query(() => MimeType)
  @Authorized()
  async mimeType(@Arg('url') url: string): Promise<MimeType> {
    const { headers } = await axios.head(url);
    return { value: headers['content-type'] };
  }
}
