import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import { Track } from './Track';
import { TrackEdition } from './TrackEdition';

@ObjectType()
export class TrackEditionWithTrackItem extends TrackEdition {
  @Field(() => Track, { nullable: false })
  @prop()
  track: Track;
}

export const TrackEditionWithTrackItemModel = getModelForClass(TrackEditionWithTrackItem);
