import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { NotAuthorizedError } from '../errors/NotAuthorized';
import { Message } from '../models/Message';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { MessageConnection } from '../types/MessageConnection';
import { PageInput } from '../types/PageInput';
import { SendMessageInput } from '../types/SendMessageInput';
import { SendMessagePayload } from '../types/SendMessagePayload';

@Resolver(Message)
export class MessageResolver {
  @FieldResolver(() => Profile)
  fromProfile(@Ctx() { profileService }: Context, @Root() message: Message): Promise<Profile> {
    return profileService.getProfile(message.fromId);
  }

  @Authorized()
  @Query(() => MessageConnection)
  chatHistory(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId: currentUserProfileId }: User,
    @Arg('profileId') profileId: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<MessageConnection> {
    return messageService.getMessages(currentUserProfileId, profileId, page);
  }

  @Authorized()
  @Query(() => Message)
  async message(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<Message> {
    const message = await messageService.getMessage(id);
    if (!(message.fromId === profileId || message.toId === profileId))
      throw new NotAuthorizedError('Message', id, profileId);
    return message;
  }

  @Authorized()
  @Mutation(() => SendMessagePayload)
  async sendMessage(
    @Ctx() { messageService }: Context,
    @Arg('input') { message, toId }: SendMessageInput,
    @CurrentUser() { profileId: fromId }: User,
  ): Promise<SendMessagePayload> {
    const newMessage = await messageService.createMessage({ fromId, toId, message });
    return { message: newMessage };
  }

  @Mutation(() => Profile)
  @Authorized()
  resetUnreadMessagesCount(@CurrentUser() { profileId }: User, @Ctx() { messageService }: Context): Promise<Profile> {
    return messageService.resetUnreadMessagesCount(profileId);
  }
}
