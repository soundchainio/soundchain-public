import axios from 'axios';
import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { MimeType } from '../types/MimeType';
import { UploadUrl } from '../types/UploadUrl';

@Resolver()
export class UploadResolver {
  @Query(() => UploadUrl)
  @Authorized()
  uploadUrl(@Ctx() { uploadService }: Context, @Arg('fileType') fileType: string): Promise<UploadUrl> {
    return uploadService.generateUploadUrl(fileType);
  }

  // Guest upload URL - allows anonymous users to upload images for guest posts
  @Query(() => UploadUrl)
  guestUploadUrl(@Ctx() { uploadService }: Context, @Arg('fileType') fileType: string): Promise<UploadUrl> {
    // Only allow image uploads for guests
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      throw new Error('Guests can only upload images');
    }
    return uploadService.generateUploadUrl(fileType);
  }

  @Query(() => MimeType)
  async mimeType(@Arg('url') url: string): Promise<MimeType> {
    const { headers } = await axios.head(url);
    return { value: headers['content-type'] };
  }
}
