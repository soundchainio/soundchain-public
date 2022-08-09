import Mux, { Asset } from '@mux/mux-node';
import { config } from '../config';
import { Context } from '../types/Context';
import { MuxUpload } from '../types/MuxUpload';

export class MuxService {
  muxClient: Mux;

  constructor(private context: Context) {
    this.muxClient = new Mux(config.mux.tokenId, config.mux.tokenSecret);
  }

  async create(assetUrl: string, trackId: string): Promise<Asset> {
    const asset = await this.muxClient.Video.Assets.create({
      input: assetUrl,
      normalize_audio: false,
      playback_policy: 'public',
      passthrough: trackId,
      test: process.env.NODE_ENV === 'development',
    });
    return asset;
  }

  async createUpload(trackId: string): Promise<MuxUpload> {
    const { url, id } = await this.muxClient.Video.Uploads.create({
      cors_origin: config.web.url,
      new_asset_settings: {
        normalize_audio: false,
        playback_policy: 'public',
        passthrough: trackId,
        test: process.env.NODE_ENV === 'development',
      },
    });

    return { url, id };
  }
}
