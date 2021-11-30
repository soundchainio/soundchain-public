import { Arg, Authorized, Ctx, Query, Resolver } from 'type-graphql';
import soundchainCollectible from '../contract/Soundchain721.json';
import soundchainMarketplace from '../contract/SoundchainMarketplace.json';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { PolygonscanResult, PolygonscanResultObj } from '../types/PolygonscanResult';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const abiDecoder = require('abi-decoder');

@Resolver()
export class PolygonscanResolver {
  @Query(() => String)
  @Authorized()
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
    abiDecoder.addABI([...soundchainMarketplace.abi, ...soundchainCollectible.abi]);

    const result = serviceResult.map(trx => {
      const decoded = abiDecoder.decodeMethod(trx.input);
      return {
        ...trx,
        method: decoded?.name,
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
