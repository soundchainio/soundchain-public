import { AcceptedImageFileTypes } from 'enums/AcceptedImageFileTypes';
import { Field, InputType } from 'type-graphql';

@InputType()
export class GenerateUploadUrlInput {
  @Field(() => AcceptedImageFileTypes)
  fileType: AcceptedImageFileTypes;
}
