import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { Bid } from '../models/Bid';
import { BidsWithInfoPayload } from '../types/BidsWithInfoPayload';
import { Context } from '../types/Context';

@Resolver(Bid)
export class BidResolver {
  @Query(() => BidsWithInfoPayload)
  async bidsWithInfo(
    @Ctx() { bidService }: Context,
    @Arg('auctionId') auctionId: string,
  ): Promise<BidsWithInfoPayload> {
    const bids = await bidService.getBidsWithInfo(auctionId);
    return { bids };
  }
}
