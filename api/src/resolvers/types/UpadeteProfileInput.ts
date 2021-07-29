import { ArrayMaxSize, ValidateNested } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { SocialMediaInputType } from './SocialMediaInputType';

@InputType()
export class UpdateProfileInput {
  @Field(() => [SocialMediaInputType], { defaultValue: [], nullable: true })
  @ValidateNested()
  @ArrayMaxSize(3)
  socialMediaLinks: SocialMediaInputType[];
}
