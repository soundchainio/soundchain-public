import { SQS } from 'aws-sdk';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { config } from '../config';
import { CurrentUser } from '../decorators/current-user';
import { Track } from '../models/Track';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateTrackInput } from '../types/CreateTrackInput';
import { CreateTrackPayload } from '../types/CreateTrackPayload';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { PageInput } from '../types/PageInput';
import { SortTrackInput } from '../types/SortTrackInput';
import { TrackConnection } from '../types/TrackConnection';

@Resolver(Track)
export class TrackResolver {
  @Query(() => Track)
  track(@Ctx() { trackService }: Context, @Arg('id') id: string): Promise<Track> {
    return trackService.getTrack(id);
  }

  @Query(() => TrackConnection)
  tracks(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackInput,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getTracks(filter, sort, page);
  }

  @Mutation(() => CreateTrackPayload)
  @Authorized()
  async createTrack(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateTrackInput,
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
