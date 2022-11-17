import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class PlaylistTrack extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  playlistId: string;

  @Field()
  @prop({ required: true })
  trackEditionId: string;
}

export const PlaylistTrackModel = getModelForClass(PlaylistTrack);
