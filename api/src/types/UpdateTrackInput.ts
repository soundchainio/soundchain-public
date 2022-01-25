import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class UpdateTrackInput {
  @Field()
  trackId: string;

  @Field({ nullable: true })
  profileId: string;

  @Field(() => NFTData, { nullable: true })
  nftData: Partial<NFTData>;

  @Field({ nullable: true })
  playbackCount: number;
}
