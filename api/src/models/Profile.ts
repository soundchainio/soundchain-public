import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Genre } from '../types/Genres';
import { Model } from './Model';
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
  @prop({ required: true, default: {} })
  socialMedias: SocialMedias;

  @Field(() => [Genre])
  @prop({ required: true, type: [String], enum: Genre })
  favoriteGenres: Genre[];

  @Field(() => Number)
  @prop({ required: true, default: 0 })
  followerCount: number;

  @Field(() => Number)
  @prop({ required: true, default: 0 })
  followingCount: number;

  @Field(() => Number)
  @prop({ required: true, default: 0 })
  unreadNotificationCount: number;

  @Field(() => Number)
  @prop({ required: true, default: 0 })
  unreadMessagesCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileModel = getModelForClass(Profile);
