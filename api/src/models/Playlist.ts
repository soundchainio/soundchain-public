import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Playlist extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop()
  title: string;

  @Field({ nullable: true })
  @prop()
  description: string;

  @Field()
  @prop({ required: true })
  artworkUrl: string;

  @Field()
  @prop()
  profileId: string;

  @prop({ default: 0 })
  playbackCount: number;

  @Field(() => Date)
  createdAt: Date;
  
  @Field({ nullable: true })
  @prop({ default: false })
  deleted?: boolean;
}

export const PlaylistModel = getModelForClass(Playlist);
