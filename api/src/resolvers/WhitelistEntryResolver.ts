import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { WhitelistEntry } from '../models/WhitelistEntry';
import { Context } from '../types/Context';
import { CreateWhitelistEntryInput } from '../types/CreateWhitelistEntryInput';
import { CreateWhitelistEntryPayload } from '../types/CreateWhitelistEntryPayload';
import { UpdateOgunClaimedInput } from '../types/UpdateOgunClaimedInput';
import { UpdateWhitelistEntryPayload } from '../types/UpdateOgunClaimedWhitelistPayload';

@Resolver(WhitelistEntry)
export class WhitelistEntryResolver {
  @Mutation(() => CreateWhitelistEntryPayload)
  async createWhitelistEntry(
    @Ctx() { whitelistEntryService }: Context,
    @Arg('input') { walletAddress, emailAddress }: CreateWhitelistEntryInput,
  ): Promise<CreateWhitelistEntryPayload> {
    const whitelistEntry = await whitelistEntryService.createWhitelistEntry({ walletAddress, emailAddress });
    return { whitelistEntry };
  }

  @Query(() => WhitelistEntry)
  whitelistEntryByWallet(
    @Ctx() { whitelistEntryService }: Context,
    @Arg('walletAdress') walletAdress: string,
  ): Promise<WhitelistEntry> {
    return whitelistEntryService.getWhitelistEntryByWallet(walletAdress);
  }

  @Mutation(() => UpdateWhitelistEntryPayload)
  async updateOgunClaimedWhitelist(
    @Ctx() { whitelistEntryService }: Context,
    @Arg('input') { id, ogunClaimed }: UpdateOgunClaimedInput,
  ): Promise<UpdateWhitelistEntryPayload> {
    const whitelistEntry = await whitelistEntryService.updateOgunClaimed(id, ogunClaimed);
    return { whitelistEntry };
  }
}
