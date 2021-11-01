import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ProfileVerificationStatusType } from '../types/ProfileVerificationStatusType';
import { Model } from './Model';

@ObjectType()
export class ProfileVerificationRequest extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field({ nullable: false })
  @prop({ required: true })
  profileId: string;

  @Field({ nullable: true })
  @prop({ required: false })
  soundcloud?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  youtube?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  bandcamp?: string;

  @Field({ nullable: true })
  @prop({ default: false })
  status?: ProfileVerificationStatusType;

  @Field({ nullable: true })
  @prop({ default: false })
  reason?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileVerificationRequestModel = getModelForClass(ProfileVerificationRequest);
