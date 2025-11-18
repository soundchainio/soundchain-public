import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class FilterTrackInput {
  @Field(() => String, { nullable: true })
  profileId?: string;

  @Field(() => String, { nullable: true })
  trackEditionId?: string;

  @Field(() => NFTData, { nullable: true })
  nftData: Partial<NFTData>;
}
