import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { ObjectType } from 'type-graphql';
import Model from './Model';

@modelOptions({ options: { customName: 'user_email_verification' } })
@ObjectType()
export default class UserEmailVerification extends Model {
  @prop({ required: true })
  userId: string;

  @prop({ required: true })
  token: string;
}

export const UserEmailVerificationModel = getModelForClass(UserEmailVerification);
