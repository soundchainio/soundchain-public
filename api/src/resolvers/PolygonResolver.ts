import { Authorized, Ctx, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';

@Resolver()
export class PolygonscanResolver {
  @Query(() => String)
  @Authorized()
  async maticUsd(@Ctx() { polygonscanService }: Context): Promise<string> {
    return await polygonscanService.getMaticUsd();
  }
}
