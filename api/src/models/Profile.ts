import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';
import { SocialMedias } from './SocialMedias';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType()
export class Profile extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  displayName: string;

  @Field({ nullable: true })
  @prop({ required: false })
  profilePicture?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  coverPicture?: string;

  @Field(() => SocialMedias)
  @prop({ required: false, default: {} })
  socialMedias?: SocialMedias;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileModel = getModelForClass(Profile);
