import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { WhitelistEntry } from '../models/WhitelistEntry';
import { Context } from '../types/Context';
import { CreateWhitelistEntryInput } from '../types/CreateWhitelistEntryInput';
import { CreateWhitelistEntryPayload } from '../types/CreateWhitelistEntryPayload';

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
}