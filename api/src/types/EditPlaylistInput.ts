import { Field, InputType } from 'type-graphql';

@InputType()
export class EditPlaylistData {
  @Field()
  playlistId: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  artworkUrl?: string;
}
