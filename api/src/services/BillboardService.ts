/**
 * Billboard Service — OGUN-powered ad slot management
 *
 * Handles creation, querying, expiration, and stats for billboard ads.
 * Users pay OGUN to promote on SoundChain for 1-7 days.
 */

import { Billboard, BillboardModel, BillboardStatus, BillboardSlot } from '../models/Billboard'
import { Service } from './Service'

// OGUN pricing per day per slot
const OGUN_PRICE_PER_DAY: Record<BillboardSlot, number> = {
  [BillboardSlot.FEED_TOP]: 50,
  [BillboardSlot.SIDEBAR_1]: 30,
  [BillboardSlot.SIDEBAR_2]: 30,
  [BillboardSlot.RADIO]: 40,
  [BillboardSlot.EXPLORE]: 35,
  [BillboardSlot.USERS]: 25,
}

export class BillboardService extends Service {
  /**
   * Get OGUN price for a billboard slot + duration
   */
  getPrice(slot: BillboardSlot, durationDays: number): number {
    return OGUN_PRICE_PER_DAY[slot] * durationDays
  }

  /**
   * Create a new billboard purchase
   */
  async createBillboard(input: {
    profileId: string
    slot: BillboardSlot
    title: string
    description?: string
    imageUrl?: string
    linkUrl?: string
    durationDays: number
    txHash?: string
  }): Promise<Billboard> {
    const { slot, durationDays } = input
    const ogunPaid = this.getPrice(slot, durationDays)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

    const billboard = await BillboardModel.create({
      ...input,
      ogunPaid,
      status: BillboardStatus.ACTIVE,
      startsAt: now,
      expiresAt,
      impressions: 0,
      clicks: 0,
    })

    return billboard.toObject() as Billboard
  }

  /**
   * Get the active billboard for a specific slot
   * Returns the one with the most OGUN paid if multiple are active
   */
  async getActiveForSlot(slot: BillboardSlot): Promise<Billboard | null> {
    // First, expire any outdated billboards
    await BillboardModel.updateMany(
      { status: BillboardStatus.ACTIVE, expiresAt: { $lte: new Date() } },
      { $set: { status: BillboardStatus.EXPIRED } },
    )

    const billboard = await BillboardModel.findOne({
      slot,
      status: BillboardStatus.ACTIVE,
      startsAt: { $lte: new Date() },
      expiresAt: { $gt: new Date() },
    })
      .sort({ ogunPaid: -1 }) // Highest bidder wins the slot
      .lean()

    return billboard as Billboard | null
  }

  /**
   * Get all active billboards (for frontend to load all slots in one query)
   */
  async getAllActive(): Promise<Billboard[]> {
    await BillboardModel.updateMany(
      { status: BillboardStatus.ACTIVE, expiresAt: { $lte: new Date() } },
      { $set: { status: BillboardStatus.EXPIRED } },
    )

    const billboards = await BillboardModel.find({
      status: BillboardStatus.ACTIVE,
      startsAt: { $lte: new Date() },
      expiresAt: { $gt: new Date() },
    })
      .sort({ ogunPaid: -1 })
      .lean()

    return billboards as Billboard[]
  }

  /**
   * Get billboards for a specific profile (my billboards)
   */
  async getByProfile(profileId: string): Promise<Billboard[]> {
    const billboards = await BillboardModel.find({ profileId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return billboards as Billboard[]
  }

  /**
   * Increment impression count
   */
  async trackImpression(billboardId: string): Promise<void> {
    await BillboardModel.updateOne(
      { _id: billboardId },
      { $inc: { impressions: 1 } },
    )
  }

  /**
   * Increment click count
   */
  async trackClick(billboardId: string): Promise<void> {
    await BillboardModel.updateOne(
      { _id: billboardId },
      { $inc: { clicks: 1 } },
    )
  }

  /**
   * Pause a billboard (owner action)
   */
  async pause(billboardId: string, profileId: string): Promise<Billboard | null> {
    const billboard = await BillboardModel.findOneAndUpdate(
      { _id: billboardId, profileId, status: BillboardStatus.ACTIVE },
      { $set: { status: BillboardStatus.PAUSED } },
      { new: true },
    ).lean()

    return billboard as Billboard | null
  }

  /**
   * Resume a paused billboard
   */
  async resume(billboardId: string, profileId: string): Promise<Billboard | null> {
    const billboard = await BillboardModel.findOneAndUpdate(
      { _id: billboardId, profileId, status: BillboardStatus.PAUSED, expiresAt: { $gt: new Date() } },
      { $set: { status: BillboardStatus.ACTIVE } },
      { new: true },
    ).lean()

    return billboard as Billboard | null
  }

  /**
   * Get pricing info for all slots
   */
  getPricing(): Array<{ slot: BillboardSlot; pricePerDay: number }> {
    return Object.entries(OGUN_PRICE_PER_DAY).map(([slot, pricePerDay]) => ({
      slot: slot as BillboardSlot,
      pricePerDay,
    }))
  }
}
