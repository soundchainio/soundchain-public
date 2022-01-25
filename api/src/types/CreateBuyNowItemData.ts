import { modelOptions } from '@typegoose/typegoose';
import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType('CreateBuyNowItemType')
@InputType('CreateBuyNowItemInput')
@modelOptions({ schemaOptions: { _id: false } })
export class CreateBuyNowItemData {
  @Field({ nullable: true })
  readonly id?: string;

  @Field()
  owner: string;

  @Field()
  nft: string;

  @Field()
  tokenId: number;

  @Field()
  pricePerItem: string;

  @Field()
  pricePerItemToShow: number;

  @Field()
  startingTime: number;
}
