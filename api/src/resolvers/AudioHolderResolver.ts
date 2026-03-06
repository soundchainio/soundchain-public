import mongoose from 'mongoose';
import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { AudioHolder } from '../models/AudioHolder';
import { Context } from '../types/Context';
import { UpdateOgunClaimedInput } from '../types/UpdateOgunClaimedInput';
import { UpdateOgunClaimedAudioHolderPayload } from '../types/UpdateOgunClaimedPayload';

@Resolver(AudioHolder)
export class AudioHolderResolver {
  @Query(() => AudioHolder)
  audioHolderByWallet(
    @Ctx() { audioHolderService }: Context,
    @Arg('walletAdress') walletAdress: string,
  ): Promise<AudioHolder> {
    return audioHolderService.getAudioHolderByWallet(walletAdress);
  }

  @Mutation(() => UpdateOgunClaimedAudioHolderPayload)
  async updateOgunClaimedAudioHolder(
    @Ctx() { audioHolderService }: Context,
    @Arg('input') { id, ogunClaimed }: UpdateOgunClaimedInput,
  ): Promise<UpdateOgunClaimedAudioHolderPayload> {
    const audioHolder = await audioHolderService.updateOgunClaimed(new mongoose.Types.ObjectId(id), ogunClaimed);
    return { audioHolder };
  }
}
