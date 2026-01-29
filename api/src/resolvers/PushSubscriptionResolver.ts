import { Arg, Authorized, Ctx, InputType, Field, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { PushSubscription } from '../models/PushSubscription';
import { User } from '../models/User';
import { Context } from '../types/Context';

@InputType()
class PushSubscriptionKeysInput {
  @Field(() => String)
  p256dh: string;

  @Field(() => String)
  auth: string;
}

@InputType()
class PushSubscriptionInput {
  @Field(() => String)
  endpoint: string;

  @Field(() => PushSubscriptionKeysInput)
  keys: PushSubscriptionKeysInput;

  @Field(() => String, { nullable: true })
  userAgent?: string;

  @Field(() => String, { nullable: true })
  deviceName?: string;
}

@Resolver()
export class PushSubscriptionResolver {
  @Query(() => String, { nullable: true })
  vapidPublicKey(@Ctx() { webPushService }: Context): string | null {
    return webPushService.getPublicKey();
  }

  @Mutation(() => PushSubscription)
  @Authorized()
  subscribeToPush(
    @CurrentUser() { profileId }: User,
    @Ctx() { pushSubscriptionService }: Context,
    @Arg('input') input: PushSubscriptionInput,
  ): Promise<PushSubscription> {
    return pushSubscriptionService.subscribe(profileId.toString(), input);
  }

  @Mutation(() => Boolean)
  @Authorized()
  unsubscribeFromPush(
    @CurrentUser() { profileId }: User,
    @Ctx() { pushSubscriptionService }: Context,
    @Arg('endpoint') endpoint: string,
  ): Promise<boolean> {
    return pushSubscriptionService.unsubscribe(profileId.toString(), endpoint);
  }

  @Query(() => Boolean)
  @Authorized()
  hasPushSubscription(
    @CurrentUser() { profileId }: User,
    @Ctx() { pushSubscriptionService }: Context,
  ): Promise<boolean> {
    return pushSubscriptionService.hasSubscriptions(profileId.toString());
  }
}
