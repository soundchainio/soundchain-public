import { Field, InputType } from 'type-graphql';

@InputType()
export class CreatePlaylistTracks {
  @Field()
  playlistId: string;

  @Field(() => [String])
  trackEditionIds: string[];
}
