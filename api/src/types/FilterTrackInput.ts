import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class FilterTrackInput {
  @Field({ nullable: true })
  profileId?: string;

  @Field(() => NFTData, { nullable: true })
  nftData: Partial<NFTData>;
}
