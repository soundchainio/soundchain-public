import { Field, InputType } from 'type-graphql';
import { Genre } from './Genres';
import { NFTData } from './NFTData';

@InputType()
export class CreateTrackInput {
  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description: string;

  @Field(() => String, { nullable: true })
  utilityInfo: string;

  @Field(() => String)
  assetUrl: string;

  @Field(() => String, { nullable: true })
  artworkUrl: string;

  @Field(() => String, { nullable: true })
  artist: string;

  @Field(() => String, { nullable: true })
  artistId: string;

  @Field(() => String, { nullable: true })
  artistProfileId: string;

  @Field(() => String, { nullable: true })
  album: string;

  @Field(() => String, { nullable: true })
  ISRC: string;

  @Field(() => Number, { nullable: true })
  releaseYear: number;

  @Field(() => String, { nullable: true })
  copyright: string;

  @Field(() => [Genre], { nullable: true })
  genres: Genre[];

  @Field(() => String, { nullable: true })
  trackEditionId: string;

  @Field(() => NFTData, { nullable: true })
  nftData: NFTData;
}

/**
 * Simplified input for non-web3 track uploads (SCid only, no NFT)
 * Used for artists who just want to upload music and get an SCid
 * without minting NFTs or connecting a wallet
 */
@InputType()
export class CreateTrackWithSCidInput {
  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  assetUrl: string;

  @Field(() => String, { nullable: true })
  artworkUrl?: string;

  @Field(() => String, { nullable: true })
  artist?: string;

  @Field(() => String, { nullable: true })
  album?: string;

  @Field(() => Number, { nullable: true })
  releaseYear?: number;

  @Field(() => String, { nullable: true })
  copyright?: string;

  @Field(() => [Genre], { nullable: true })
  genres?: Genre[];

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  createPost?: boolean;
}
