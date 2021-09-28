import { Field, InputType } from 'type-graphql';

@InputType()
export class UploadTrackInput {
  @Field()
  fileType: string;
}
