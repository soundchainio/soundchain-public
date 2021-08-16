import { AcceptedProfileImageFileTypes } from 'enums/AcceptedImageFileTypes';
import { Field, InputType } from 'type-graphql';

@InputType()
export class GenerateUploadUrlInput {
  @Field(() => AcceptedProfileImageFileTypes)
  fileType: AcceptedProfileImageFileTypes;
}
