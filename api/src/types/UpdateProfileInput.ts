import { ArrayUnique } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { DefaultCoverPicture } from './DefaultCoverPicture';
import { DefaultProfilePicture } from './DefaultProfilePicture';
import { Genre } from './Genres';
import { MusicianType } from './MusicianTypes';
import { SocialMedias } from './SocialMedias';

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  displayName: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  profilePicture?: string;

  @Field(() => DefaultProfilePicture, { nullable: true })
  defaultProfilePicture: DefaultProfilePicture;

  @Field({ nullable: true })
  coverPicture?: string;

  @Field(() => DefaultCoverPicture, { nullable: true })
  defaultCoverPicture: DefaultCoverPicture;

  @ArrayUnique()
  @Field(() => [Genre], { nullable: true })
  favoriteGenres: Genre[];

  @ArrayUnique()
  @Field(() => [MusicianType], { nullable: true })
  musicianTypes: MusicianType[];

  @Field({ nullable: true })
  socialMedias: SocialMedias;
}
