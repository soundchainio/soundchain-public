import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pinataClient, { PinataClient, PinataPinResponse } from '@pinata/sdk';
import { config } from '../config';
import { Context } from '../types/Context';

export class PinningService {
  pinata: PinataClient;

  constructor(private context: Context) {
    this.pinata = pinataClient(config.minting.pinataKey, config.minting.pinataSecret);
  }

  /**
   *
   * @param key AWS S3 file key
   * @param name file name
   * @returns
   */
  async pinToIPFS(key: string, name: string): Promise<PinataPinResponse> {
    const s3Client = new S3Client({ region: config.uploads.region, forcePathStyle: true });
    const command = new GetObjectCommand({ Bucket: config.uploads.bucket, Key: key });
    const response = await s3Client.send(command);
    const assetResult = await this.pinata.pinFileToIPFS(response.Body, {
      pinataMetadata: {
        name: name,
      },
    });
    return assetResult;
  }

  async pinJsonToIPFS(json: unknown, name: string): Promise<PinataPinResponse> {
    const response = await this.pinata.pinJSONToIPFS(json, { pinataMetadata: { name: `${name}-metadata` } });

    return response;
  }
}
