import { getModelForClass, pre, prop } from '@typegoose/typegoose';
import { hash } from 'bcrypt';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';

const saltWorkFactor = 10;

@pre<User>('save', async function (done) {
  if (!this.isModified('password')) {
    return done();
  }

  try {
    this.password = await hash(this.password, saltWorkFactor);
    done();
  } catch (error) {
    done(error);
  }
})
@ObjectType()
export default class User extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  email: string;

  @Field()
  @prop({ required: true })
  handle: string;

  @prop({ required: true })
  password: string;

  @prop({ required: false })
  emailVerificationToken: string;

  @Field()
  @prop({ required: true, default: false })
  verified: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserModel = getModelForClass(User);
