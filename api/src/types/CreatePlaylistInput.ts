import { Field, InputType } from 'type-graphql';

@InputType()
export class CreatePlaylistData {
  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  artworkUrl?: string;

  @Field(() => [String], { nullable: true })
  tracks?: string[];
}
