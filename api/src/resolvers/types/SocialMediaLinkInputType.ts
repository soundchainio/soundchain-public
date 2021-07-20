import { Field, InputType } from 'type-graphql';

@InputType()
export default class SocialMediaLinkInputType {
  @Field()
  name: string;

  @Field()
  link: string;
}
