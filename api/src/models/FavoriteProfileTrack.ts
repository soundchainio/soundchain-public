import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class FavoriteProfileTrack extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  trackId: string;

  @prop({ required: false })
  trackEditionId: string;
}

export const FavoriteProfileTrackModel = getModelForClass(FavoriteProfileTrack);
