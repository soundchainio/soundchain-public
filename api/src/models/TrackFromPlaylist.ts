import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class TrackFromPlaylist extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  trackId: string;

  @Field()
  @prop({ required: true })
  playlistId: string;

  @Field({ nullable: true })
  @prop({ default: false })
  deleted?: boolean;
}

export const TrackFromPlaylistModel = getModelForClass(TrackFromPlaylist);
