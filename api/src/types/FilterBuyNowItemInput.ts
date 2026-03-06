import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class FilterBuyNowItemInput {
  @Field({ nullable: false })
  trackEdition: string;

  @Field(() => NFTData, { nullable: true })
  nftData?: Partial<NFTData>;
}
