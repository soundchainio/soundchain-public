import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Mux from '@mux/mux-node';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AudioUpload } from '../types/AudioUpload';
import { Context } from '../types/Context';
import { ImageUploadFileType } from '../types/ImageUploadFileType';
import { ImageUploadUrl } from '../types/ImageUploadUrl';

const FIVE_MINUTES = 1000 * 60 * 5;

export class UploadService {
  s3Client: S3Client;
  muxClient: Mux;

  constructor(private context: Context) {
    this.s3Client = new S3Client({ region: config.uploads.region });
    this.muxClient = new Mux(config.mux.tokenId, config.mux.tokenSecret);
  }

  async generateImageUploadUrl(fileType: ImageUploadFileType): Promise<ImageUploadUrl> {
    const imageId = uuidv4();
    const extension = fileType.split('/')[1];
    const fileName = `${imageId}.${extension}`;
    const bucketParams: PutObjectCommandInput = {
      Bucket: config.uploads.bucket,
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
    };
    const command = new PutObjectCommand(bucketParams);
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: FIVE_MINUTES,
    });
    return {
      uploadUrl,
      fileName,
      readUrl: `https://${config.uploads.bucket}.s3.${config.uploads.region}.amazonaws.com/${fileName}`,
    };
  }

  async createAudioUpload(trackId: string): Promise<AudioUpload> {
    const { url, id } = await this.muxClient.Video.Uploads.create({
      cors_origin: config.web.url,
      new_asset_settings: {
        playback_policy: 'public',
        passthrough: trackId,
        test: process.env.NODE_ENV === 'development',
      },
    });

    return { url, id };
  }
}
