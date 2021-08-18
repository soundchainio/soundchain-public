import { AcceptedProfileImageFileTypes } from 'enums/AcceptedImageFileTypes';
import { UploadService } from 'services/UploadService';
import { Arg, Query, Resolver } from 'type-graphql';
import { UploadUrlPayload } from './types/UploadUrlPayload';

@Resolver()
export class UploadResolver {
  @Query(() => UploadUrlPayload)
  async uploadUrl(
    @Arg('fileType', () => AcceptedProfileImageFileTypes) fileType: AcceptedProfileImageFileTypes,
  ): Promise<UploadUrlPayload> {
    return UploadService.generateUploadUrl(fileType);
  }
}
