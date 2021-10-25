import { modelOptions } from '@typegoose/typegoose';
import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType('CreateListingItemType')
@InputType('CreateListingItemInput')
@modelOptions({ schemaOptions: { _id: false } })
export class CreateListingItemData {
  @Field({ nullable: true })
  readonly id?: string;

  @Field()
  owner: string;

  @Field()
  nft: string;

  @Field()
  tokenId: number;

  @Field()
  quantity: number;

  @Field()
  pricePerItem: string;

  @Field()
  startingTime: number;
}
