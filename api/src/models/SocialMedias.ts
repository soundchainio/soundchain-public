import { prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SocialMedias {
  @Field()
  @prop({ required: true, default: '' })
  facebook: string;

  @Field()
  @prop({ required: true, default: '' })
  instagram: string;

  @Field()
  @prop({ required: true, default: '' })
  soundcloud: string;

  @Field()
  @prop({ required: true, default: '' })
  twitter: string;
}
