import Mux from '@mux/mux-node';
import { config } from '../config';
import { Context } from '../types/Context';
import { MuxUpload } from '../types/MuxUpload';

export class MuxService {
  private muxClient: Mux;

  constructor(private context: Context) {
    // v7.x constructor: two string arguments
    this.muxClient = new Mux(config.mux.tokenId, config.mux.tokenSecret);
  }

  async create(assetUrl: string, trackId: string) {
    // Use capital "Video" -> capital "Assets"
    // Provide arrays for 'input' and 'playback_policy'
    const asset = await this.muxClient.Video.Assets.create({
      input: [{ url: assetUrl }],
      normalize_audio: false,
      playback_policy: ['public'],
      passthrough: trackId,
      test: process.env.NODE_ENV === 'development',
    });
    return asset;
  }

  async createUpload(trackId: string): Promise<MuxUpload> {
    // Use capital "Video" -> capital "Uploads"
    const { url, id } = await this.muxClient.Video.Uploads.create({
      cors_origin: config.web.url,
      new_asset_settings: {
        normalize_audio: false,
        playback_policy: ['public'],
        passthrough: trackId,
        test: process.env.NODE_ENV === 'development',
      },
    });

    return { url, id };
  }
}
