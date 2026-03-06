import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class UpdateTrackInput {
  @Field(() => String)
  trackId: string;

  @Field(() => String, { nullable: true })
  profileId: string;

  @Field(() => NFTData, { nullable: true })
  nftData: Partial<NFTData>;

  @Field(() => Number, { nullable: true })
  playbackCount: number;
}
