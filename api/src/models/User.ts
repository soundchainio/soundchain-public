import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';
import SocialMediaLink from './SocialMediaLink';

@ObjectType()
export default class User extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  email: string;

  @Field()
  @prop({ required: true })
  handle: string;

  @Field()
  @prop({ required: true })
  displayName: string;

  @prop({ required: true })
  password: string;

  @Field()
  @prop({ default: '' })
  profilePhoto: string;

  @Field()
  @prop({ default: '' })
  coverPhoto: string;

  @Field(() => [String])
  @prop({ required: true, default: [] })
  favoriteGenres: string[];

  @Field(() => [String])
  @prop({ required: true, default: [] })
  favoriteArtists: string[];

  @Field(() => [SocialMediaLink])
  @prop({ required: true, default: [] })
  socialMediaLinks: SocialMediaLink[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserModel = getModelForClass(User);
