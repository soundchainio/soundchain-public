import { Field, InputType } from 'type-graphql';

@InputType()
export class DeletePlaylistTracks {
  @Field()
  playlistId: string;

  @Field(() => [String])
  trackIds: string[];
}
