import { Field, InputType } from 'type-graphql';

@InputType()
export class AddTrackMetadataInput {
  @Field()
  trackId: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description: string;
}
