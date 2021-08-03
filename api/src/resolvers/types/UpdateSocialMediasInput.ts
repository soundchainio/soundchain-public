import { Matches } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { handleRegex } from '../../utils/validation';

@InputType()
export class UpdateSocialMediasInput {
  @Field()
  @Matches(handleRegex, { message: 'Invalid characters' })
  facebook: string;

  @Field()
  @Matches(handleRegex, { message: 'Invalid characters' })
  instagram: string;

  @Field()
  @Matches(handleRegex, { message: 'Invalid characters' })
  soundcloud: string;

  @Field()
  @Matches(handleRegex, { message: 'Invalid characters' })
  twitter: string;
}
