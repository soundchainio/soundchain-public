import { Field, InputType } from 'type-graphql';
import { SocialMediaInputType } from './SocialMediaInputType';

@InputType()
export class UpdateProfileInput {
  @Field(() => [SocialMediaInputType], { defaultValue: [], nullable: true })
  socialMediaLinks: SocialMediaInputType[];
}
