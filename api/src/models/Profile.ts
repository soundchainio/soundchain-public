import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { sample } from 'lodash';
import { Field, ID, ObjectType } from 'type-graphql';
import { Badge } from '../types/Badge';
import { Genre } from '../types/Genres';
import { MusicianType } from '../types/MusicianTypes';
import { SocialMedias } from '../types/SocialMedias';
import { Model } from './Model';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType()
export class Profile extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  displayName: string;

  @Field(() => String, { nullable: true })
  @prop({ required: true, default: randomDefaultProfilePicture() })
  profilePicture: string;

  @Field(() => String, { nullable: true })
  @prop({ required: true, default: randomDefaultCoverPicture() })
  coverPicture: string;

  @Field(() => SocialMedias)
  @prop({ required: true, default: {} })
  socialMedias: SocialMedias;

  @Field(() => [Genre], { nullable: true })
  @prop({ required: true, type: [String], enum: Genre })
  favoriteGenres: Genre[];

  @Field(() => [MusicianType], { nullable: true })
  @prop({ required: true, type: [String], enum: MusicianType })
  musicianTypes: MusicianType[];

  @Field(() => String, { nullable: true })
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

  @Field(() => Boolean, { nullable: true })
  @prop({ required: true, default: false })
  verified: boolean;

  @Field(() => String, { nullable: true })
  magicWalletAddress?: string;

  @Field(() => [Badge], { nullable: true })
  @prop({ type: [String], enum: Badge, default: [] })
  badges: string[];

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  lastSeenAt?: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProfileModel = getModelForClass(Profile);

function randomDefaultProfilePicture() {
  return sample([
    '/default-pictures/profile/red.png',
    '/default-pictures/profile/orange.png',
    '/default-pictures/profile/yellow.png',
    '/default-pictures/profile/green.png',
    '/default-pictures/profile/teal.png',
    '/default-pictures/profile/blue.png',
    '/default-pictures/profile/purple.png',
    '/default-pictures/profile/pink.png',
  ]);
}

function randomDefaultCoverPicture() {
  return sample([
    '/default-pictures/cover/birds.jpeg',
    '/default-pictures/cover/cells.jpeg',
    '/default-pictures/cover/fog.jpeg',
    '/default-pictures/cover/net.jpeg',
    '/default-pictures/cover/rings.jpeg',
    '/default-pictures/cover/waves.jpeg',
  ]);
}
