import { ArrayUnique } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { Genre } from './Genres';
import { MusicianType } from './MusicianTypes';
import { SocialMedias } from './SocialMedias';

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
}
