import { Field, ObjectType } from 'type-graphql';
import { AuctionItem } from '../models/AuctionItem';

@ObjectType()
export class AuctionItemPayload {
  @Field(() => AuctionItem, { nullable: true })
  auctionItem: AuctionItem;
}
