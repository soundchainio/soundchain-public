import { prop } from '@typegoose/typegoose';
import { Field, ObjectType, registerEnumType } from 'type-graphql';

export enum SocialMediaName {
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
}

registerEnumType(SocialMediaName, {
  name: 'SocialMediaName',
  description: 'Social media options',
});

@ObjectType()
export default class SocialMedia {
  @Field(() => SocialMediaName)
  @prop({ required: true, enum: SocialMediaName })
  name: SocialMediaName;

  @Field()
  @prop({ required: true })
  link: string;
}
