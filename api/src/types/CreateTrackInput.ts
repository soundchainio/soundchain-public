import { Field, InputType } from 'type-graphql';
import { Genre } from './Genres';
import { NFTData } from './NFTData';

@InputType()
export class CreateTrackInput {
  @Field()
  title: string;

  @Field({ nullable: true })
  description: string;

  @Field({ nullable: true })
  utilityInfo: string;

  @Field()
  assetUrl: string;

  @Field({ nullable: true })
  artworkUrl: string;

  @Field({ nullable: true })
  artist: string;

  @Field({ nullable: true })
  artistId: string;

  @Field({ nullable: true })
  artistProfileId: string;

  @Field({ nullable: true })
  album: string;

  @Field({ nullable: true })
  ISRC: string;

  @Field({ nullable: true })
  releaseYear: number;

  @Field({ nullable: true })
  copyright: string;

  @Field(() => [Genre], { nullable: true })
  genres: Genre[];

  @Field()
  trackEditionId: string;

  @Field(() => NFTData, { nullable: true })
  nftData: NFTData;
}
