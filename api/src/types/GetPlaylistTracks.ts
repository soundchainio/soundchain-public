import { Field, InputType } from 'type-graphql';

@InputType()
export class GetPlaylistTracks {
  @Field()
  playlistId: string;

  @Field()
  trackEditionId: string;
}
