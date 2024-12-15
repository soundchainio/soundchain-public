import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PinataSDK } from 'pinata-web3';
import { config } from '../config';
import { Context } from '../types/Context';

export class PinningService {
  pinata: PinataSDK;

  constructor(private context: Context) {
    // Initialize Pinata SDK
    this.pinata = new PinataSDK({
      apiKey: config.minting.pinataKey,
      secretApiKey: config.minting.pinataSecret,
    });
  }

  /**
   * Helper function to convert a stream to a buffer
   */
  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (value) {
        chunks.push(value);
      }
      done = streamDone;
    }

    return Buffer.concat(chunks);
  }

  /**
   * Pins an AWS S3 file to IPFS
   * @param key AWS S3 file key
   * @param name File name
   */
  async pinToIPFS(key: string, name: string): Promise<string> {
    const s3Client = new S3Client({ region: config.uploads.region, forcePathStyle: true });
    const command = new GetObjectCommand({ Bucket: config.uploads.bucket, Key: key });
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Failed to retrieve file from S3: Body is null or undefined');
    }

    // Convert the S3 file stream into a buffer
    const fileBuffer = await this.streamToBuffer(response.Body);

    // Pin file to IPFS
    const result = await this.pinata.pinFile(fileBuffer, {
      name: name,
    });

    return result.cid; // Return the CID of the pinned file
  } catch (error) {
    console.error(`Error pinning file to IPFS: ${error.message}`, error);
    throw new Error('An error occurred while pinning the file to IPFS.');
  }
}  

  /**
   * Pins a JSON object to IPFS
   * @param json JSON object to pin
   * @param name Name for the pinned JSON
   */
  async pinJsonToIPFS(json: unknown, name: string): Promise<string> {
    const result = await this.pinata.pinJSON(json, { name: `${name}-metadata` });
    return result.cid; // Return the CID of the pinned JSON
  } catch (error) {
    console.error(`Error pinning JSON to IPFS: ${error.message}`, error);
    throw new Error('An error occurred while pinning the JSON to IPFS.');
  }
}
}
