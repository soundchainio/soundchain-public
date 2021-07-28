import { Field, InputType } from 'type-graphql';
import { SocialMediaName } from '../../models/SocialMedia';

@InputType()
export class SocialMediaInputType {
  @Field(() => SocialMediaName)
  name: SocialMediaName;

  @Field()
  link: string;
}
