import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { paginate, PaginateResult } from '../db/pagination/paginate';
import { FavoritePlaylist, FavoritePlaylistModel } from '../models/FavoritePlaylist';
import { FollowPlaylist, FollowPlaylistModel } from '../models/FollowPlaylist';
import { Playlist, PlaylistModel } from '../models/Playlist';
import { TrackModel } from '../models/Track';
import { PlaylistTrack, PlaylistTrackModel, PlaylistTrackSourceType } from '../models/PlaylistTrack';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { ModelService } from './ModelService';
import { SortPlaylistInput } from './SortPlaylistInput';
import { CreatePlaylistTracks } from '../types/CreatePlaylistTracks';
import { DeletePlaylistTracks } from '../types/DeletePlaylistTracks';
import { AddPlaylistItemInput } from '../types/AddPlaylistItem';

interface CreatePlaylistParams {
  title: string;
  description: string;
  artworkUrl: string;
  profileId: string;
  trackIds?: string[];
}

interface EditPlaylistParams {
  playlistId: string;
  title?: string;
  description?: string;
  artworkUrl?: string;
  profileId?: string;
}

export class PlaylistService extends ModelService<typeof Playlist> {
  constructor(context: Context) {
    super(context, PlaylistModel);
  }

  // Public method to get a playlist by ID (returns null if not found)
  async findById(id: string): Promise<Playlist | null> {
    try {
      return await this.model.findOne({ _id: id, deleted: false });
    } catch (error) {
      console.error('[PlaylistService.findById] Error:', error);
      return null;
    }
  }

  async createPlaylistTrack(trackIds: string[], profileId: string, playlist: DocumentType<Playlist>): Promise<void> {
    // Fetch full track data for metadata
    const existingTracks = await TrackModel.find({ _id: { $in: trackIds } });

    const playlistTracks = existingTracks.map((track, index) => {
      const playlistTrack = new PlaylistTrackModel({
        trackId: track._id,
        profileId,
        playlistId: playlist.id,
        sourceType: PlaylistTrackSourceType.NFT,
        title: track.title || null,
        artist: track.artist || null,
        artworkUrl: track.artworkUrl || null,
        position: index,
      });
      return playlistTrack.save();
    });

    await Promise.all(playlistTracks);
  }

  async createPlaylist(params: CreatePlaylistParams): Promise<Playlist> {
    const { trackIds = [], profileId } = params;

    const playlist = new this.model(params);
    await playlist.save();

    if (trackIds.length > 0) {
      await this.createPlaylistTrack(trackIds, profileId, playlist);
    }

    // Refetch to ensure document is properly hydrated for GraphQL field resolution
    const savedPlaylist = await this.model.findById(playlist._id);
    return savedPlaylist!;
  }

  async updatePlaylist(params: EditPlaylistParams): Promise<Playlist> {
    const { playlistId, title, artworkUrl, description } = params;

    const playlist = await this.model.findOneAndUpdate(
      { _id: playlistId },
      {
        title,
        artworkUrl,
        description,
      },
      { new: true },
    );

    if (!playlist) {
      throw new Error(`Playlist with id ${playlistId} not found`);
    }

    return playlist;
  }

  async deletePlaylist(playlistId: string, profileId: string): Promise<boolean> {
    // Verify ownership and delete
    const result = await this.model.deleteOne({
      _id: playlistId,
      profileId,
    });

    if (result.deletedCount === 0) {
      throw new Error('Playlist not found or you do not have permission to delete it');
    }

    // Also delete all tracks in the playlist
    await PlaylistTrackModel.deleteMany({ playlistId });

    // Delete favorites and follows
    await FavoritePlaylistModel.deleteMany({ playlistId });
    await FollowPlaylistModel.deleteMany({ playlistId });

    return true;
  }

  async createPlaylistTracks(params: CreatePlaylistTracks, profileId: string): Promise<void> {
    const { trackIds, playlistId } = params;

    // Fetch track metadata for all tracks
    const tracks = await TrackModel.find({ _id: { $in: trackIds } });
    const trackMap = new Map(tracks.map(t => [t._id.toString(), t]));

    // Get the current max position in the playlist
    const lastTrack = await PlaylistTrackModel.findOne({ playlistId })
      .sort({ position: -1 })
      .select('position');
    let nextPosition = lastTrack ? lastTrack.position + 1 : 0;

    const playlistTracks = trackIds.map(trackId => {
      const track = trackMap.get(trackId);
      const position = nextPosition++;
      return {
        updateOne: {
          filter: { playlistId, trackId },
          update: {
            $set: {
              trackId,
              playlistId,
              profileId,
              sourceType: PlaylistTrackSourceType.NFT,
              title: track?.title || null,
              artist: track?.artist || null,
              artworkUrl: track?.artworkUrl || null,
              position,
            },
          },
          upsert: true,
        },
      };
    });

    await PlaylistTrackModel.bulkWrite(playlistTracks);
  }

  async deletePlaylistTracks(params: DeletePlaylistTracks, profileId: string): Promise<void> {
    const { trackIds, playlistId } = params;

    const playlistTracks = trackIds.map(trackId => ({
      deleteOne: {
        filter: { playlistId, trackId, profileId },
      },
    }));

    await PlaylistTrackModel.bulkWrite(playlistTracks);
  }

  getPlaylists(profileId?: string, sort?: SortPlaylistInput, page?: PageInput): Promise<PaginateResult<Playlist>> {
    return this.paginate({ filter: { profileId, deleted: false }, sort, page });
  }

  async favoriteCount(playlistId: string): Promise<number> {
    return await FavoritePlaylistModel.countDocuments({ playlistId });
  }

  async followCount(playlistId: string): Promise<number> {
    return await FollowPlaylistModel.countDocuments({ playlistId });
  }

  async toggleFavorite(playlistId: string, profileId: string): Promise<FavoritePlaylist> {
    const favoritePlaylist = await FavoritePlaylistModel.findOne({ playlistId, profileId });

    if (favoritePlaylist?.id) {
      return await FavoritePlaylistModel.findOneAndDelete({ playlistId, profileId });
    }

    const favorite = new FavoritePlaylistModel({
      profileId,
      playlistId,
    });

    await favorite.save();
    return favorite;
  }

  async isFavorite(playlistId: string, profileId: string): Promise<boolean> {
    return !!(await FavoritePlaylistModel.exists({
      playlistId,
      profileId,
    }));
  }

  async togglePlaylistFollow(playlistId: string, profileId: string): Promise<FollowPlaylist> {
    const followPlaylistModel = await FollowPlaylistModel.findOne({ playlistId, profileId });

    if (followPlaylistModel?.id) {
      return await FollowPlaylistModel.findOneAndDelete({ playlistId, profileId });
    }

    const favorite = new FollowPlaylistModel({
      profileId,
      playlistId,
    });

    await favorite.save();
    return favorite;
  }

  async isFollowed(playlistId: string, profileId: string): Promise<boolean> {
    return !!(await FollowPlaylistModel.exists({
      playlistId,
      profileId,
    }));
  }

  getFavoritePlaylists(
    ids: mongoose.Types.ObjectId[],
    search?: string,
    sort?: SortPlaylistInput,
    page?: PageInput,
  ): Promise<PaginateResult<Playlist>> {
    const regex = new RegExp(search || '', 'i');

    const filter = {
      $or: [{ title: regex }, { description: regex }, { profileId: regex }, { playbackCount: regex }],
    };

    return this.paginate({
      filter: { _id: { $in: ids }, title: { $exists: true }, deleted: false, ...filter },
      sort,
      page,
    });
  }

  getTracksFromPlaylist(
    playlistId: string,
    sort?: any,
    page?: PageInput,
  ): Promise<PaginateResult<PlaylistTrack>> {
    // Note: PlaylistTrack model doesn't have a 'deleted' field
    // Use $ne: true to match both false and undefined/missing
    const filter = { playlistId, deleted: { $ne: true } };

    return paginate(PlaylistTrackModel, { filter: { ...filter }, sort, page });
  }

  // Universal playlist support - add any source type
  async addPlaylistItem(input: AddPlaylistItemInput, profileId: string): Promise<PlaylistTrack> {
    const { playlistId, sourceType, trackId, externalUrl, uploadedFileUrl, title, artist, artworkUrl, duration, position } = input;

    // Verify playlist exists and user owns it
    const playlist = await this.model.findOne({ _id: playlistId, profileId, deleted: false });
    if (!playlist) {
      throw new Error('Playlist not found or you do not have permission to modify it');
    }

    // Validate based on source type
    if (sourceType === PlaylistTrackSourceType.NFT) {
      if (!trackId) {
        throw new Error('trackId is required for NFT source type');
      }
      // Verify the track exists
      const track = await TrackModel.findById(trackId);
      if (!track) {
        throw new Error('Track not found');
      }
    } else if (sourceType === PlaylistTrackSourceType.UPLOAD) {
      if (!uploadedFileUrl) {
        throw new Error('uploadedFileUrl is required for UPLOAD source type');
      }
      if (!title) {
        throw new Error('title is required for uploaded files');
      }
    } else {
      // External URL sources (YouTube, SoundCloud, Bandcamp, etc.)
      if (!externalUrl) {
        throw new Error('externalUrl is required for external source types');
      }
    }

    // Get the next position if not specified
    let itemPosition = position;
    if (itemPosition === undefined) {
      const lastTrack = await PlaylistTrackModel.findOne({ playlistId })
        .sort({ position: -1 })
        .select('position');
      itemPosition = lastTrack ? lastTrack.position + 1 : 0;
    }

    // Create the playlist track
    const playlistTrack = new PlaylistTrackModel({
      playlistId,
      profileId,
      sourceType,
      trackId: sourceType === PlaylistTrackSourceType.NFT ? trackId : undefined,
      externalUrl: externalUrl || undefined,
      uploadedFileUrl: uploadedFileUrl || undefined,
      title: title || undefined,
      artist: artist || undefined,
      artworkUrl: artworkUrl || undefined,
      duration: duration || undefined,
      position: itemPosition,
    });

    await playlistTrack.save();
    return playlistTrack;
  }

  // Delete a playlist item by ID
  async deletePlaylistItem(playlistItemId: string, profileId: string): Promise<boolean> {
    const result = await PlaylistTrackModel.deleteOne({
      _id: playlistItemId,
      profileId,
    });
    return result.deletedCount > 0;
  }

  // Reorder playlist items
  async reorderPlaylistItems(playlistId: string, itemIds: string[], profileId: string): Promise<boolean> {
    // Verify ownership
    const playlist = await this.model.findOne({ _id: playlistId, profileId, deleted: false });
    if (!playlist) {
      throw new Error('Playlist not found or you do not have permission to modify it');
    }

    // Update positions in order
    const updates = itemIds.map((itemId, index) => ({
      updateOne: {
        filter: { _id: itemId, playlistId },
        update: { $set: { position: index } },
      },
    }));

    await PlaylistTrackModel.bulkWrite(updates);
    return true;
  }
}
