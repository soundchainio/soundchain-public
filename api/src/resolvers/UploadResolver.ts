import { UploadService } from 'services/UploadService';
import { Arg, Query, Resolver } from 'type-graphql';
import { UploadUrlInput } from './types/UploadUrlInput';
import { UploadUrlPayload } from './types/UploadUrlPayload';

@Resolver()
export class UploadResolver {
  @Query(() => UploadUrlPayload)
  async uploadUrl(
    @Arg('input')
    { fileType }: UploadUrlInput,
  ): Promise<UploadUrlPayload> {
    return UploadService.generateUploadUrl(fileType);
  }
}
