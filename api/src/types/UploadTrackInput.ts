import { Field, InputType } from 'type-graphql';

@InputType()
export class UploadTrackInput {
  @Field()
  title: string;

  @Field({ nullable: true })
  description: string;

  @Field()
  assetUrl: string;

  @Field({ nullable: true })
  artworkUrl: string;
}
