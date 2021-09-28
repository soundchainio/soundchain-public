import { SQS } from 'aws-sdk';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateTrackPayload } from '../types/CreateTrackPayload';
import { MintingRequestInput } from '../types/MintingRequestInput';

@Resolver(Track)
export class MintingRequestResolver {
  @Mutation()
  @Authorized()
  async mintingRequest(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: MintingRequestInput,
  ): Promise<CreateTrackPayload> {
    const { assetUrl, artUrl, ...rest } = input;
    const assetKey = assetUrl.substring(assetUrl.lastIndexOf('/') + 1);
    const artKey = artUrl ? artUrl.substring(artUrl.lastIndexOf('/') + 1) : undefined;
    const sqs = new SQS({
      region: config.uploads.region,
    });
    await sqs
      .sendMessage({
        QueueUrl: config.minting.sqsUrl,
        MessageBody: JSON.stringify({ assetKey: assetKey, artKey: artKey, ...rest }),
        MessageGroupId: config.minting.contractAddress,
      })
      .promise();
    const track = await trackService.createTrack({ profileId, audioUrl: input.assetUrl, title: input.name });
    return { track };
  }
}
