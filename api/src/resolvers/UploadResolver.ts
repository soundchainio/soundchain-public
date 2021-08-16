import { UploadService } from 'services/UploadService';
import { Arg, Query, Resolver } from 'type-graphql';
import { GenerateUploadUrlInput } from './types/GenerateUploadUrlInput';
import { GenerateUploadUrlPayload } from './types/GenerateUploadUrlPayload';

@Resolver()
export class UploadResolver {
  @Query(() => GenerateUploadUrlPayload)
  async generateUploadUrl(
    @Arg('input')
    { fileType }: GenerateUploadUrlInput,
  ): Promise<GenerateUploadUrlPayload> {
    return UploadService.generateUploadUrl(fileType);
  }
}
