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

  // Guest upload URL - allows anonymous users to upload media for guest posts
  // Media is ephemeral (24h) by default, users can pay to make permanent
  @Query(() => UploadUrl)
  guestUploadUrl(@Ctx() { uploadService }: Context, @Arg('fileType') fileType: string): Promise<UploadUrl> {
    // Allow images, videos, and audio for guests (ephemeral posts)
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      // Videos - expanded for browser compatibility
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska',
      'video/x-m4v', 'video/3gpp', 'video/3gpp2', 'video/ogg',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/mp4',
      'audio/aiff', 'audio/x-aiff', 'audio/x-m4a', 'audio/webm',
    ];
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}. Supported: images, videos, and audio.`);
    }
    return uploadService.generateUploadUrl(fileType);
  }

  @Query(() => MimeType)
  async mimeType(@Arg('url') url: string): Promise<MimeType> {
    const { headers } = await axios.head(url);
    return { value: headers['content-type'] };
  }
}
