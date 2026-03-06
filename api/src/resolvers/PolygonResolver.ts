// import abiDecoder from 'abi-decoder';
import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import soundchainCollectible from '../contract/Soundchain721.json';
import soundchainAuction from '../contract/SoundchainAuction.json';
import soundchainMarketplace from '../contract/SoundchainMarketplace.json';
import soundchainCollectibleV2 from '../contract/v2/Soundchain721Editions.json';
import soundchainMarketplaceV2 from '../contract/v2/SoundchainMarketplaceEditions.json';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { PolygonscanResult, PolygonscanResultObj } from '../types/PolygonscanResult';

@Resolver()
export class PolygonscanResolver {
  @Query(() => String)
  async maticUsd(@Ctx() { polygonscanService }: Context): Promise<string> {
    return await polygonscanService.getMaticUsd();
  }

  @Query(() => PolygonscanResult)
  @Authorized()
  async getTransactionHistory(
    @Ctx() { polygonscanService }: Context,
    @Arg('wallet') wallet: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<PolygonscanResult> {
    const { nextPage, result: serviceResult } = await polygonscanService.getTransactionHistory(wallet, page);
    // Comment out abi-decoder usage since blockchainWatcher is disabled
    // abiDecoder.addABI([
    //   ...soundchainMarketplace.abi,
    //   ...soundchainCollectible.abi,
    //   ...soundchainAuction.abi,
    //   ...soundchainCollectibleV2.abi,
    //   ...soundchainMarketplaceV2.abi,
    // ]);

    const result = serviceResult.map(trx => {
      // let decoded = abiDecoder.decodeMethod(trx.input)?.name;
      // if (!decoded && parseInt(trx.value)) {
      //   decoded = 'transfer';
      // }
      return {
        ...trx,
        // method: decoded,
        date: new Date(parseInt(trx.timeStamp) * 1000).toLocaleDateString('en-US'),
      } as PolygonscanResultObj;
    });

    return { result, nextPage };
  }

  @Query(() => PolygonscanResult)
  @Authorized()
  async getInternalTransactionHistory(
    @Ctx() { polygonscanService }: Context,
    @Arg('wallet') wallet: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<PolygonscanResult> {
    const { nextPage, result: serviceResult } = await polygonscanService.getInternalTransactionHistory(wallet, page);

    const result = serviceResult.map(trx => {
      return {
        ...trx,
        date: new Date(parseInt(trx.timeStamp) * 1000).toLocaleDateString('en-US'),
      } as PolygonscanResultObj;
    });

    return { result, nextPage };
  }
}
