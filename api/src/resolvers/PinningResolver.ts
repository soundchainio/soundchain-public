import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { Field, InputType } from 'type-graphql';
import { Context } from '../types/Context';
import { PinJsonToIPFSInput } from '../types/PinJsonToIPFSInput';
import { PinningPayload } from '../types/PinningPayload';
import { PinToIPFSInput } from '../types/PinToIPFSInput';
import { Readable } from 'stream';

// Direct upload input - accepts base64 encoded file data
@InputType()
class DirectPinInput {
  @Field()
  fileName: string;

  @Field()
  base64Data: string;  // Base64 encoded file content

  @Field()
  mimeType: string;
}

@Resolver()
export class PinningResolver {
  @Mutation(() => PinningPayload)
  @Authorized()
  async pinToIPFS(@Ctx() { pinningService }: Context, @Arg('input') input: PinToIPFSInput): Promise<PinningPayload> {
    const { fileName, fileKey } = input;

    const pinningResult = await pinningService.pinToIPFS(fileKey, fileName);

    return { cid: pinningResult.IpfsHash };
  }

  // Guest version - no authentication required
  // Allows guests to pin media for stories/posts
  @Mutation(() => PinningPayload)
  async guestPinToIPFS(@Ctx() { pinningService }: Context, @Arg('input') input: PinToIPFSInput): Promise<PinningPayload> {
    const { fileName, fileKey } = input;

    const pinningResult = await pinningService.pinToIPFS(fileKey, fileName);

    return { cid: pinningResult.IpfsHash };
  }

  @Mutation(() => PinningPayload)
  @Authorized()
  async pinJsonToIPFS(
    @Ctx() { pinningService }: Context,
    @Arg('input') input: PinJsonToIPFSInput,
  ): Promise<PinningPayload> {
    const { fileName, json } = input;

    const pinningResult = await pinningService.pinJsonToIPFS(json, fileName);

    return { cid: pinningResult.IpfsHash };
  }

  /**
   * FAST DIRECT UPLOAD - Skips S3, pins directly to IPFS
   * Use for smaller files (<50MB) for fastest possible upload
   * Accepts base64 encoded file data
   */
  @Mutation(() => PinningPayload)
  async directPinToIPFS(
    @Ctx() { pinningService }: Context,
    @Arg('input') input: DirectPinInput,
  ): Promise<PinningPayload> {
    const { fileName, base64Data, mimeType } = input;

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Create a readable stream from the buffer
    const stream = Readable.from(buffer);

    // Pin directly to IPFS (skipping S3 entirely!)
    const pinningResult = await pinningService.pinata.pinFileToIPFS(stream, {
      pinataMetadata: {
        name: fileName,
        keyvalues: {
          type: mimeType.startsWith('video/') ? 'video' : 'image',
          platform: 'soundchain',
          uploadType: 'direct',
        } as any,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    });

    return { cid: pinningResult.IpfsHash };
  }
}
