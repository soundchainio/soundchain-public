import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { Model } from './Model';

// Source types for universal playlist support
export enum PlaylistTrackSourceType {
  NFT = 'nft',                    // SoundChain NFT track
  YOUTUBE = 'youtube',            // YouTube video/music
  SOUNDCLOUD = 'soundcloud',      // SoundCloud track
  BANDCAMP = 'bandcamp',          // Bandcamp track/album
  SPOTIFY = 'spotify',            // Spotify track (embed)
  APPLE_MUSIC = 'apple_music',    // Apple Music track
  TIDAL = 'tidal',                // Tidal track
  VIMEO = 'vimeo',                // Vimeo video
  UPLOAD = 'upload',              // User-uploaded file
  CUSTOM = 'custom',              // Any other URL
}

registerEnumType(PlaylistTrackSourceType, {
  name: 'PlaylistTrackSourceType',
  description: 'The source type of a playlist track',
});

@ObjectType()
export class PlaylistTrack extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  profileId: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ required: true, type: mongoose.Types.ObjectId })
  playlistId: mongoose.Types.ObjectId;

  // SoundChain NFT track ID (optional - only for NFT source type)
  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId })
  trackId?: mongoose.Types.ObjectId;

  // Source type for universal playlist support
  // Made nullable for backwards compatibility with old playlist tracks
  @Field(() => PlaylistTrackSourceType, { nullable: true, defaultValue: PlaylistTrackSourceType.NFT })
  @prop({ enum: PlaylistTrackSourceType, default: PlaylistTrackSourceType.NFT })
  sourceType?: PlaylistTrackSourceType;

  // External URL (YouTube, SoundCloud, Bandcamp, Spotify, etc.)
  @Field(() => String, { nullable: true })
  @prop()
  externalUrl?: string;

  // Uploaded file URL (for user uploads to S3)
  @Field(() => String, { nullable: true })
  @prop()
  uploadedFileUrl?: string;

  // Metadata for external sources (not linked to SoundChain track)
  @Field(() => String, { nullable: true })
  @prop()
  title?: string;

  @Field(() => String, { nullable: true })
  @prop()
  artist?: string;

  @Field(() => String, { nullable: true })
  @prop()
  artworkUrl?: string;

  // Duration in seconds (for uploaded files)
  @Field(() => Number, { nullable: true })
  @prop()
  duration?: number;

  // Position in playlist for ordering
  @Field(() => Number)
  @prop({ default: 0 })
  position: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PlaylistTrackModel = getModelForClass(PlaylistTrack);
