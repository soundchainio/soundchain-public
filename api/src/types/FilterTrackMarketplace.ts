import { Field, InputType } from 'type-graphql';
import { Genre } from './Genres';
import { SaleType } from './SaleType';

@InputType()
export class FilterTrackMarketplace {
  @Field(() => [Genre], { nullable: true })
  genres?: Genre[];

  @Field(() => ListingItem, { nullable: true })
  listingItem: Partial<ListingItem>;
}

@InputType('ListingItemInput')
export class ListingItem {
  @Field(() => SaleType, { nullable: true })
  saleType?: SaleType;

  @Field(() => Boolean, { nullable: true })
  acceptsMATIC?: boolean;

  @Field(() => Boolean, { nullable: true })
  acceptsOGUN?: boolean;
}
