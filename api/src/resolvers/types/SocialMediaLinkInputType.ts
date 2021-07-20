import { Field, InputType } from 'type-graphql';
import { SocialMediaName } from '../../models/SocialMediaLink';

@InputType()
export default class SocialMediaLinkInputType {
  @Field(() => SocialMediaName)
  name: SocialMediaName;

  @Field()
  link: string;
}
