import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { MuxAsset } from '../types/MuxAsset';
import { Model } from './Model';

@ObjectType()
export class AuctionItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop()
  title: string;

  @Field({ nullable: true })
  @prop()
  description: string;

  @Field({ nullable: true })
  @prop()
  artworkUrl: string;

  @Field({ nullable: true })
  @prop()
  artist: string;

  @prop({ default: 0 })
  playbackCount: number;

  @prop()
  muxAsset: MuxAsset;

  @Field({ nullable: true })
  @prop({ default: false })
  deleted?: boolean;
}

export const AuctionItemModel = getModelForClass(AuctionItem);
