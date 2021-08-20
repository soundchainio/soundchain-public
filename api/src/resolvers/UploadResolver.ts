import { Arg, Query, Resolver } from 'type-graphql';
import { UploadFileType } from '../enums/UploadFileType';
import { UploadService } from '../services/UploadService';
import { UploadUrl } from './types/UploadUrl';

@Resolver()
export class UploadResolver {
  @Query(() => UploadUrl)
  async uploadUrl(@Arg('fileType', () => UploadFileType) fileType: UploadFileType): Promise<UploadUrl> {
    return UploadService.generateUploadUrl(fileType);
  }
}
