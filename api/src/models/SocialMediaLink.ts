import { prop } from '@typegoose/typegoose';
import { Field, ObjectType, registerEnumType } from 'type-graphql';

export enum SocialMediaName {
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
}

registerEnumType(SocialMediaName, {
  name: 'SocialMediaName', // this one is mandatory
  description: 'Social media options', // this one is optional
});

@ObjectType()
export default class SocialMediaLink {
  @Field(() => SocialMediaName)
  @prop({ required: true, enum: SocialMediaName })
  name: string;

  @Field()
  @prop({ required: true })
  link: string;
}
