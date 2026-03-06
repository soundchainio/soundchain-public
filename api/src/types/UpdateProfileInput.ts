import { ArrayUnique } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { Genre } from './Genres';
import { MusicianType } from './MusicianTypes';
import { SocialMedias } from './SocialMedias';

@InputType()
export class WallAudioPlaylistItemInput {
  @Field(() => String)
  audioUrl: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  artist?: string;

  @Field(() => String, { nullable: true })
  coverUrl?: string;

  @Field(() => String, { nullable: true })
  wallPostId?: string;
}

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  displayName: string;

  @Field(() => String, { nullable: true })
  bio?: string;

  @Field(() => String, { nullable: true })
  profilePicture?: string;

  @Field(() => String, { nullable: true })
  coverPicture?: string;

  @ArrayUnique()
  @Field(() => [Genre], { nullable: true })
  favoriteGenres: Genre[];

  @ArrayUnique()
  @Field(() => [MusicianType], { nullable: true })
  musicianTypes: MusicianType[];

  @Field(() => SocialMedias, { nullable: true })
  socialMedias: SocialMedias;

  @Field(() => String, { nullable: true })
  featuredTrackId?: string;

  @Field(() => String, { nullable: true })
  featuredAudioUrl?: string;

  @Field(() => String, { nullable: true })
  featuredAudioTitle?: string;

  @Field(() => String, { nullable: true })
  featuredAudioArtist?: string;

  @Field(() => String, { nullable: true })
  featuredAudioCoverUrl?: string;

  @Field(() => [WallAudioPlaylistItemInput], { nullable: true })
  wallAudioPlaylist?: WallAudioPlaylistItemInput[];

  @Field(() => [String], { nullable: true })
  topFriends?: string[];
}
