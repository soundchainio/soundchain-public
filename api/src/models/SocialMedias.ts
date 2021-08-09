import { prop } from '@typegoose/typegoose';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SocialMedias {
  @Field({ nullable: true })
  @prop({ required: false })
  facebook?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  instagram?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  soundcloud?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  twitter?: string;
}
