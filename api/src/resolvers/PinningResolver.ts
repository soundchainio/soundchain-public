import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { PinJsonToIPFSInput } from '../types/PinJsonToIPFSInput';
import { PinningPayload } from '../types/PinningPayload';
import { PinToIPFSInput } from '../types/PinToIPFSInput';

@Resolver()
export class PinningResolver {
  @Mutation(() => PinningPayload)
  @Authorized()
  async pinToIPFS(@Ctx() { pinningService }: Context, @Arg('input') input: PinToIPFSInput): Promise<PinningPayload> {
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
}
