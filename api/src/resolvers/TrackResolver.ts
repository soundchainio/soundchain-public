import { SQS } from 'aws-sdk';
import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { AddTrackMetadataInput } from '../types/AddTrackMetadataInput';
import { AddTrackMetadataPayload } from '../types/AddTrackMetadataPayload';
import { Context } from '../types/Context';
import { CreateTrackInput } from '../types/CreateTrackInput';
import { CreateTrackPayload } from '../types/CreateTrackPayload';
import { UploadTrackInput } from '../types/UploadTrackInput';
import { UploadTrackPayload } from '../types/UploadTrackPayload';

@Resolver(Track)
export class TrackResolver {
  @Mutation(() => UploadTrackPayload)
  @Authorized()
  async uploadTrack(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') { fileType }: UploadTrackInput,
  ): Promise<UploadTrackPayload> {
    const track = await trackService.createTrack({ profileId, fileType });
    return { track };
  }

  @Mutation(() => AddTrackMetadataPayload)
  @Authorized()
  async addTrackMetadata(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackId, ...metadata }: AddTrackMetadataInput,
  ): Promise<AddTrackMetadataPayload> {
    const track = await trackService.updateTrack(trackId, metadata);
    return { track };
  }

  @Mutation(() => CreateTrackPayload)
  @Authorized()
  async createTrack(
    @Arg('input') input: CreateTrackInput,
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
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
    const track = await trackService.createNftTrack({ profileId, file: input.assetUrl, title: input.name });
    return { track };
  }
}
