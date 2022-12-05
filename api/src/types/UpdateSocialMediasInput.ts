import { Matches, MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { handleRegex } from '../utils/Validation';

@InputType()
export class UpdateSocialMediasInput {
  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  facebook?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  instagram?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  soundcloud?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  twitter?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  linktree?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  discord?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  telegram?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  spotify?: string;

  @Field({ nullable: true })
  @Matches(handleRegex, { message: 'Invalid characters' })
  @MaxLength(100)
  bandcamp?: string;
}
