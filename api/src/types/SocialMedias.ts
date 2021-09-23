import { prop } from '@typegoose/typegoose';
import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType()
@InputType('SocialMediasInput')
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
