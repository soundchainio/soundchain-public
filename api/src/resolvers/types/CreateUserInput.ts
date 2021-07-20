import { ArrayMaxSize, IsEmail, Length } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import SocialMediaLinkInputType from './SocialMediaLinkInputType';

@InputType()
export default class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @Length(3, 255)
  displayName: string;

  @Field()
  @Length(3, 255)
  handle: string;

  @Field()
  @Length(8, 30)
  password: string;

  @Field({ defaultValue: '', nullable: true })
  profilePhoto: string;

  @Field({ defaultValue: '', nullable: true })
  coverPhoto: string;

  @Field(() => [String], { defaultValue: [], nullable: true })
  @ArrayMaxSize(5)
  favoriteGenres: string[];

  @Field(() => [String], { defaultValue: [], nullable: true })
  @ArrayMaxSize(10)
  favoriteArtists: string[];

  @Field(() => [SocialMediaLinkInputType], { defaultValue: [], nullable: true })
  socialMediaLinks: SocialMediaLinkInputType[];
}
