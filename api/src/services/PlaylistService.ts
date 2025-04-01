import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { paginate, PaginateResult } from '../db/pagination/paginate';
import { FavoritePlaylist, FavoritePlaylistModel } from '../models/FavoritePlaylist';
import { FollowPlaylist, FollowPlaylistModel } from '../models/FollowPlaylist';
import { Playlist, PlaylistModel } from '../models/Playlist';
import { TrackModel } from '../models/Track';
import { PlaylistTrack, PlaylistTrackModel } from '../models/PlaylistTrack';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { ModelService } from './ModelService';
import { SortPlaylistInput } from './SortPlaylistInput';
import { CreatePlaylistTracks } from '../types/CreatePlaylistTracks';
import { DeletePlaylistTracks } from '../types/DeletePlaylistTracks';

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

  async createPlaylistTrack(trackIds: string[], profileId: string, playlist: DocumentType<Playlist>): Promise<void> {
    const existingTracks = await TrackModel.find({ _id: { $in: trackIds } }, '_id');

    const playlistTracks = existingTracks.map(track => {
      const playlistTrack = new PlaylistTrackModel({
        trackId: track._id,
        profileId,
        playlistId: playlist.id,
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

    return playlist;
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

  async createPlaylistTracks(params: CreatePlaylistTracks, profileId: string): Promise<void> {
    const { trackIds, playlistId } = params;

    const playlistTracks = trackIds.map(trackId => ({
      updateOne: {
        filter: { playlistId, trackId },
        update: {
          $set: {
            trackId,
            playlistId,
            profileId,
          },
        },
        upsert: true,
      },
    }));

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
    const filter = { playlistId, deleted: false };

    return paginate(PlaylistTrackModel, { filter: { ...filter }, sort, page });
  }
}
