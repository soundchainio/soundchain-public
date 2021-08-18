import { AcceptedProfileImageFileTypes } from 'enums/AcceptedImageFileTypes';
import { UploadService } from 'services/UploadService';
import { Arg, Query, Resolver } from 'type-graphql';
import { UploadUrl } from './types/UploadUrl';

@Resolver()
export class UploadResolver {
  @Query(() => UploadUrl)
  async uploadUrl(
    @Arg('fileType', () => AcceptedProfileImageFileTypes) fileType: AcceptedProfileImageFileTypes,
  ): Promise<UploadUrl> {
    return UploadService.generateUploadUrl(fileType);
  }
}
