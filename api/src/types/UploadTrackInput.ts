import { Field, InputType } from 'type-graphql';

@InputType()
export class UploadTrackInput {
  @Field()
  fileType: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description: string;

  @Field({ nullable: true })
  artworkUrl: string;
}
