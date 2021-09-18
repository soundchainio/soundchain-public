import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { sample } from 'lodash';
import { Field, ID, ObjectType } from 'type-graphql';
import { DefaultCoverPicture } from '../types/DefaultCoverPicture';
import { DefaultProfilePicture } from '../types/DefaultProfilePicture';
import { Genre } from '../types/Genres';
import { MusicianType } from '../types/MusicianTypes';
import { SocialMedias } from '../types/SocialMedias';
import { Model } from './Model';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType()
export class Profile extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  displayName: string;

  @prop({ required: false })
  profilePicture?: string;

  @Field(() => DefaultProfilePicture)
  @prop({ required: true, default: randomDefaultProfilePicture() })
  defaultProfilePicture: DefaultProfilePicture;

  @prop({ required: false })
  coverPicture?: string;

  @Field(() => DefaultCoverPicture)
  @prop({ required: true, default: randomDefaultCoverPicture() })
  defaultCoverPicture: DefaultCoverPicture;

  @Field(() => SocialMedias)
  @prop({ required: true, default: {} })
  socialMedias: SocialMedias;

  @Field(() => [Genre])
  @prop({ required: true, type: [String], enum: Genre })
  favoriteGenres: Genre[];

  @Field(() => [MusicianType])
  @prop({ required: true, type: [String], enum: MusicianType })
  musicianTypes: MusicianType[];

  @Field({ nullable: true })
  @prop({ required: false })
  bio?: string;

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
  unreadMessageCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileModel = getModelForClass(Profile);

function randomDefaultProfilePicture() {
  return sample(Object.values(DefaultProfilePicture));
}

function randomDefaultCoverPicture() {
  return sample(Object.values(DefaultCoverPicture));
}
