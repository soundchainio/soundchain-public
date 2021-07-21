import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';
import SocialMediaLink from './SocialMediaLink';

@ObjectType()
export default class Profile extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  displayName: string;

  @Field({ nullable: true })
  @prop({ required: false })
  profilePicture: string;

  @Field({ nullable: true })
  @prop({ required: false })
  coverPicture: string;

  @Field(() => [SocialMediaLink])
  @prop({ required: true, default: [] })
  socialMediaLinks: SocialMediaLink[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileModel = getModelForClass(Profile);
