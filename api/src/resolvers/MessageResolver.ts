import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { NotAuthorizedError } from '../errors/NotAuthorized';
import { Message } from '../models/Message';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { SendMessageInput } from '../types/SendMessageInput';
import { SendMessagePayload } from '../types/SendMessagePayload';

@Resolver(Message)
export class MessageResolver {
  @FieldResolver(() => Profile)
  fromProfile(@Ctx() { profileService }: Context, @Root() message: Message): Promise<Profile> {
    return profileService.getProfile(message.fromId.toString());
  }

  @Authorized()
  @Query(() => Message)
  async message(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<Message> {
    const message = await messageService.getMessage(id);
    if (!(message.fromId.toString() === profileId.toString() || message.toId.toString() === profileId.toString()))
      throw new NotAuthorizedError('Message', id, profileId.toString());
    return message;
  }

  @Authorized()
  @Mutation(() => SendMessagePayload)
  async sendMessage(
    @Ctx() { messageService }: Context,
    @Arg('input') { message, toId }: SendMessageInput,
    @CurrentUser() { profileId: fromId }: User,
  ): Promise<SendMessagePayload> {
    const newMessage = await messageService.createMessage({
      fromId,
      toId: new mongoose.Types.ObjectId(toId),
      message,
    });
    return { message: newMessage };
  }

  @Mutation(() => Profile)
  @Authorized()
  resetUnreadMessageCount(
    @CurrentUser() { profileId }: User,
    @Ctx() { profileService }: Context,
  ): Promise<Profile> {
    return profileService.resetUnreadMessageCount(profileId.toString());
  }
}
