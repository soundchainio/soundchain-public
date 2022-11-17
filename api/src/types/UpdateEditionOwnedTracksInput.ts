import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class UpdateEditionOwnedTracksInput {
  @Field(() => [String])
  trackEditionIds: string[];

  @Field()
  trackEditionId: string;

  @Field()
  owner: string;

  @Field(() => NFTData, { nullable: true })
  nftData: Partial<NFTData>;
}
