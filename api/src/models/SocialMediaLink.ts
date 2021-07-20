import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';
import Model from './Model';

@ObjectType()
export default class SocialMediaLink extends Model {
  @Field()
  @prop({ required: true })
  name: string;

  @Field()
  @prop({ required: true })
  link: string;
}

export const SocialMediaLinkModel = getModelForClass(SocialMediaLink);
