import { SQS } from 'aws-sdk';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { MintingRequest } from '../models/MintingRequest';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateMintingRequestInput } from '../types/CreateMintingRequestInput';
import { MintingRequestPayload } from '../types/MintingRequestPayload';

@Resolver(MintingRequest)
export class MintingRequestResolver {
  @Mutation(() => MintingRequestPayload)
  @Authorized()
  async createMintingRequest(
    @Ctx() { mintingRequestService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateMintingRequestInput,
  ): Promise<MintingRequestPayload> {
    const { assetUrl, artUrl, ...rest } = input;
    const assetKey = assetUrl.substring(assetUrl.lastIndexOf('/') + 1);
    const artKey = artUrl ? artUrl.substring(artUrl.lastIndexOf('/') + 1) : undefined;
    const sqs = new SQS({
      region: config.uploads.region,
    });
    try {
      await sqs
        .sendMessage({
          QueueUrl: config.minting.sqsUrl,
          MessageBody: JSON.stringify({ assetKey: assetKey, artKey: artKey, ...rest }),
          MessageGroupId: config.minting.nftAddress,
        })
        .promise();
    } catch (e) {
      console.error('Failed to create minting request', e);
    }
    const mintingRequest = await mintingRequestService.createMintingRequest({ assetKey, artKey, profileId, ...rest });
    return { mintingRequest };
  }
}
