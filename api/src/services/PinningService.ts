import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pinataClient, { PinataClient, PinataPinResponse } from '@pinata/sdk';
import { Readable } from 'stream';
import { config } from '../config';
import { Context } from '../types/Context';

// Pinata gateway configuration
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';
const PINATA_DEDICATED_GATEWAY = process.env.PINATA_DEDICATED_GATEWAY; // e.g., 'https://soundchain.mypinata.cloud/ipfs'

export interface AudioPinResult {
  ipfsCid: string;
  ipfsGatewayUrl: string;
  pinSize: number;
  timestamp: string;
}

export class PinningService {
  pinata: PinataClient;

  constructor(private context: Context) {
    this.pinata = pinataClient(config.minting.pinataKey, config.minting.pinataSecret);
  }

  /**
   * Get the best gateway URL for a CID
   * Prioritizes dedicated gateway if available
   */
  getGatewayUrl(cid: string): string {
    if (PINATA_DEDICATED_GATEWAY) {
      return `${PINATA_DEDICATED_GATEWAY}/${cid}`;
    }
    return `${PINATA_GATEWAY}/${cid}`;
  }

  /**
   * Pin audio file from S3 to IPFS for streaming
   * @param key AWS S3 file key
   * @param trackId Track ID for metadata
   * @param trackTitle Track title for naming
   * @returns AudioPinResult with CID and gateway URL
   */
  async pinAudioToIPFS(key: string, trackId: string, trackTitle: string): Promise<AudioPinResult> {
    const s3Client = new S3Client({ region: config.uploads.region, forcePathStyle: true });
    const command = new GetObjectCommand({ Bucket: config.uploads.bucket, Key: key });
    const response = await s3Client.send(command);

    const fileName = `${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${trackId}`;

    const assetResult = await this.pinata.pinFileToIPFS(response.Body as Readable, {
      pinataMetadata: {
        name: fileName,
        keyvalues: {
          trackId: trackId,
          type: 'audio',
          platform: 'soundchain',
        } as any,
      },
      pinataOptions: {
        cidVersion: 1, // Use CIDv1 for better compatibility
      },
    });

    return {
      ipfsCid: assetResult.IpfsHash,
      ipfsGatewayUrl: this.getGatewayUrl(assetResult.IpfsHash),
      pinSize: assetResult.PinSize,
      timestamp: assetResult.Timestamp,
    };
  }

  /**
   * Pin audio file from URL (for migration from Mux)
   * @param audioUrl URL of the audio file
   * @param trackId Track ID for metadata
   * @param trackTitle Track title for naming
   */
  async pinAudioFromUrl(audioUrl: string, trackId: string, trackTitle: string): Promise<AudioPinResult> {
    const fileName = `${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${trackId}`;

    const assetResult = await this.pinata.pinFromFS(audioUrl, {
      pinataMetadata: {
        name: fileName,
        keyvalues: {
          trackId: trackId,
          type: 'audio',
          platform: 'soundchain',
        } as any,
      },
    });

    return {
      ipfsCid: assetResult.IpfsHash,
      ipfsGatewayUrl: this.getGatewayUrl(assetResult.IpfsHash),
      pinSize: assetResult.PinSize,
      timestamp: assetResult.Timestamp,
    };
  }

  /**
   * Pin local audio file to IPFS (for migration)
   * @param filePath Local file path
   * @param trackId Track ID
   * @param trackTitle Track title
   */
  async pinLocalAudioFile(filePath: string, trackId: string, trackTitle: string): Promise<AudioPinResult> {
    const fileName = `${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${trackId}`;

    const assetResult = await this.pinata.pinFromFS(filePath, {
      pinataMetadata: {
        name: fileName,
        keyvalues: {
          trackId: trackId,
          type: 'audio',
          platform: 'soundchain',
          migratedFromMux: 'true',
        } as any,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    });

    return {
      ipfsCid: assetResult.IpfsHash,
      ipfsGatewayUrl: this.getGatewayUrl(assetResult.IpfsHash),
      pinSize: assetResult.PinSize,
      timestamp: assetResult.Timestamp,
    };
  }

  /**
   * Check if a CID is pinned
   */
  async isPinned(cid: string): Promise<boolean> {
    try {
      const result = await this.pinata.pinList({ hashContains: cid });
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Unpin a file (for cleanup)
   */
  async unpin(cid: string): Promise<void> {
    await this.pinata.unpin(cid);
  }

  /**
   * Original method - Pin file from S3 key
   * @param key AWS S3 file key
   * @param name file name
   * @returns
   */
  async pinToIPFS(key: string, name: string): Promise<PinataPinResponse> {
    const s3Client = new S3Client({ region: config.uploads.region, forcePathStyle: true });
    const command = new GetObjectCommand({ Bucket: config.uploads.bucket, Key: key });
    const response = await s3Client.send(command);
    const assetResult = await this.pinata.pinFileToIPFS(response.Body as Readable, {
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
