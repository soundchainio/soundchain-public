import { AcceptedProfileImageFileTypes } from 'enums/AcceptedImageFileTypes';
import { Field, InputType } from 'type-graphql';

@InputType()
export class UploadUrlInput {
  @Field(() => AcceptedProfileImageFileTypes)
  fileType: AcceptedProfileImageFileTypes;
}
