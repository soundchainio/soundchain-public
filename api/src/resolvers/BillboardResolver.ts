/**
 * Billboard Resolver — GraphQL API for OGUN billboard ads
 */

import { Arg, Authorized, Ctx, Field, Float, InputType, Int, Mutation, ObjectType, Query, Resolver } from 'type-graphql'
import { Billboard, BillboardSlot, BillboardStatus } from '../models/Billboard'
import { Context } from '../types/Context'
import { Role } from '../types/Role'

@InputType()
class CreateBillboardInput {
  @Field(() => BillboardSlot)
  slot: BillboardSlot

  @Field(() => String)
  title: string

  @Field(() => String, { nullable: true })
  description?: string

  @Field(() => String, { nullable: true })
  imageUrl?: string

  @Field(() => String, { nullable: true })
  linkUrl?: string

  @Field(() => Int)
  durationDays: number

  @Field(() => String, { nullable: true })
  txHash?: string
}

@ObjectType()
class BillboardPricing {
  @Field(() => BillboardSlot)
  slot: BillboardSlot

  @Field(() => Float)
  pricePerDay: number
}

@Resolver()
export class BillboardResolver {
  /** Get all active billboards across all slots */
  @Query(() => [Billboard])
  async activeBillboards(@Ctx() { billboardService }: Context): Promise<Billboard[]> {
    return billboardService.getAllActive()
  }

  /** Get the active billboard for a specific slot */
  @Query(() => Billboard, { nullable: true })
  async billboardForSlot(
    @Arg('slot', () => BillboardSlot) slot: BillboardSlot,
    @Ctx() { billboardService }: Context,
  ): Promise<Billboard | null> {
    return billboardService.getActiveForSlot(slot)
  }

  /** Get my billboards (all statuses) */
  @Query(() => [Billboard])
  @Authorized(Role.USER)
  async myBillboards(@Ctx() ctx: Context): Promise<Billboard[]> {
    const user = await ctx.user
    if (!user?.profileId) return []
    return ctx.billboardService.getByProfile(user.profileId.toString())
  }

  /** Get pricing for all slots */
  @Query(() => [BillboardPricing])
  billboardPricing(@Ctx() { billboardService }: Context): BillboardPricing[] {
    return billboardService.getPricing()
  }

  /** Purchase a billboard slot with OGUN */
  @Mutation(() => Billboard)
  @Authorized(Role.USER)
  async createBillboard(
    @Arg('input') input: CreateBillboardInput,
    @Ctx() ctx: Context,
  ): Promise<Billboard> {
    const user = await ctx.user
    if (!user?.profileId) throw new Error('Profile required')

    if (input.durationDays < 1 || input.durationDays > 7) {
      throw new Error('Duration must be 1-7 days')
    }

    return ctx.billboardService.createBillboard({
      profileId: user.profileId.toString(),
      ...input,
    })
  }

  /** Pause an active billboard */
  @Mutation(() => Billboard, { nullable: true })
  @Authorized(Role.USER)
  async pauseBillboard(
    @Arg('billboardId') billboardId: string,
    @Ctx() ctx: Context,
  ): Promise<Billboard | null> {
    const user = await ctx.user
    if (!user?.profileId) return null
    return ctx.billboardService.pause(billboardId, user.profileId.toString())
  }

  /** Resume a paused billboard */
  @Mutation(() => Billboard, { nullable: true })
  @Authorized(Role.USER)
  async resumeBillboard(
    @Arg('billboardId') billboardId: string,
    @Ctx() ctx: Context,
  ): Promise<Billboard | null> {
    const user = await ctx.user
    if (!user?.profileId) return null
    return ctx.billboardService.resume(billboardId, user.profileId.toString())
  }

  /** Track a billboard impression */
  @Mutation(() => Boolean)
  async trackBillboardImpression(
    @Arg('billboardId') billboardId: string,
    @Ctx() { billboardService }: Context,
  ): Promise<boolean> {
    await billboardService.trackImpression(billboardId)
    return true
  }

  /** Track a billboard click */
  @Mutation(() => Boolean)
  async trackBillboardClick(
    @Arg('billboardId') billboardId: string,
    @Ctx() { billboardService }: Context,
  ): Promise<boolean> {
    await billboardService.trackClick(billboardId)
    return true
  }
}
