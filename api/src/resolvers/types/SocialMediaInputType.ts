import { Matches } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { SocialMediaName } from '../../models/SocialMedia';

@InputType()
export class SocialMediaInputType {
  @Field(() => SocialMediaName)
  name: SocialMediaName;

  @Field()
  @Matches(/^[A-z0-9_]*$/, { message: 'Invalid characters' })
  link: string;
}
