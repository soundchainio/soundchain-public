import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { CallSignal, CallSignalModel } from '../models/CallSignal';
import { User } from '../models/User';

/**
 * CallSignalResolver — WebRTC signaling relay for voice/video calls.
 * Signals are ephemeral (60s TTL). Consumed on read (delete after poll).
 */
@Resolver()
export class CallSignalResolver {
  @Mutation(() => Boolean)
  @Authorized()
  async sendCallSignal(
    @CurrentUser() { profileId }: User,
    @Arg('recipientId') recipientId: string,
    @Arg('callId') callId: string,
    @Arg('signalType') signalType: string,
    @Arg('data') data: string,
  ): Promise<boolean> {
    const signal = new CallSignalModel();
    signal.senderId = profileId.toString();
    signal.recipientId = recipientId;
    signal.callId = callId;
    signal.signalType = signalType;
    signal.data = data;
    await signal.save();
    return true;
  }

  @Query(() => [CallSignal])
  @Authorized()
  async callSignals(
    @CurrentUser() { profileId }: User,
    @Arg('callId', { nullable: true }) callId?: string,
  ): Promise<CallSignal[]> {
    const query: Record<string, unknown> = { recipientId: profileId.toString() };
    if (callId) query.callId = callId;
    const signals = await CallSignalModel.find(query).sort({ createdAt: 1 }).limit(50).lean();
    // Delete consumed signals
    const ids = signals.map((s: any) => s._id);
    if (ids.length > 0) await CallSignalModel.deleteMany({ _id: { $in: ids } });
    return signals as unknown as CallSignal[];
  }
}
