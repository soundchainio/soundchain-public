import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class UpdateTrackInput {
  @Field()
  trackId: string;

  @Field(() => NFTData, { nullable: true })
  nftData: NFTData;
}
