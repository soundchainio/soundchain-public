import { Field, ObjectType } from 'type-graphql';
import { BuyNowItem } from '../models/BuyNowItem';

@ObjectType()
export class BuyNowPayload {
  @Field(() => BuyNowItem, { nullable: true })
  buyNowItem: BuyNowItem;
}
