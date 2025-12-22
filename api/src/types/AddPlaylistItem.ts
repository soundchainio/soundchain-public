import { Field, InputType } from 'type-graphql';
import { PlaylistTrackSourceType } from '../models/PlaylistTrack';

// Input for adding a single item to a playlist (NFT, external URL, or uploaded file)
@InputType()
export class AddPlaylistItemInput {
  @Field()
  playlistId: string;

  @Field(() => PlaylistTrackSourceType)
  sourceType: PlaylistTrackSourceType;

  // For NFT source type - SoundChain track ID
  @Field({ nullable: true })
  trackId?: string;

  // For external sources - the URL
  @Field({ nullable: true })
  externalUrl?: string;

  // For uploaded files - the S3 URL after upload
  @Field({ nullable: true })
  uploadedFileUrl?: string;

  // Metadata (required for non-NFT sources)
  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  artist?: string;

  @Field({ nullable: true })
  artworkUrl?: string;

  // Duration in seconds (optional)
  @Field({ nullable: true })
  duration?: number;

  // Position in playlist (optional - defaults to end)
  @Field({ nullable: true })
  position?: number;
}

// Input for batch adding multiple items
@InputType()
export class AddPlaylistItemsInput {
  @Field()
  playlistId: string;

  @Field(() => [AddPlaylistItemInput])
  items: AddPlaylistItemInput[];
}
