import { modelOptions } from '@typegoose/typegoose';
import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType('CreateAuctionItemType')
@InputType('CreateAuctionItemInput')
@modelOptions({ schemaOptions: { _id: false } })
export class CreateAuctionItemData {
  @Field({ nullable: true })
  readonly id?: string;

  @Field()
  owner: string;

  @Field()
  nft: string;

  @Field()
  tokenId: number;

  @Field()
  startingTime: number;

  @Field()
  endingTime: number;

  @Field()
  reservePrice: number;
}
