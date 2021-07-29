import { Field, InputType } from 'type-graphql';
import { IsSocialMediaLink } from '../../middlewares/decorators/IsSocialMediaLink';
import { SocialMediaName } from '../../models/SocialMedia';

@InputType()
export class SocialMediaInputType {
  @Field(() => SocialMediaName)
  name: SocialMediaName;

  @Field()
  @IsSocialMediaLink({ message: 'Invalid social media link' })
  link: string;
}
