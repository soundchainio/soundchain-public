import { Field, ObjectType } from 'type-graphql';
import { PlaylistTrack } from '../models/PlaylistTrack';

@ObjectType()
export class AddPlaylistItemPayload {
  @Field(() => PlaylistTrack, { nullable: true })
  playlistTrack?: PlaylistTrack;

  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class DeletePlaylistItemPayload {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
export class ReorderPlaylistItemsPayload {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}
