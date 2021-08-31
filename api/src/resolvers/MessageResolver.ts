import { ApolloError } from 'apollo-server-express';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Message } from '../models/Message';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { ChatConnection } from '../types/MessageConnection';
import { PageInput } from '../types/PageInput';
import { SendMessageInput } from '../types/SendMessageInput';
import { SendMessagePayload } from '../types/SendMessagePayload';

@Resolver(Message)
export class MessageResolver {
  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() message: Message): Promise<Profile> {
    return profileService.getProfile(message.profileId);
  }

  @Authorized()
  @Query(() => ChatConnection)
  chat(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId: currentUserProfileId }: User,
    @Arg('profileId') profileId: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ChatConnection> {
    return messageService.getChat(currentUserProfileId, profileId, page);
  }

  @Authorized()
  @Query(() => Message)
  async message(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<Message> {
    const message = await messageService.getMessage(id);
    if (!(message.to === profileId || message.profileId === profileId)) throw new ApolloError('Not authorized');
    return message;
  }

  @Authorized()
  @Mutation(() => SendMessagePayload)
  async sendMessage(
    @Ctx() { messageService }: Context,
    @Arg('input') { message, to }: SendMessageInput,
    @CurrentUser() { profileId }: User,
  ): Promise<SendMessagePayload> {
    const newMessage = await messageService.createMessage({ profileId, to, message });
    return { message: newMessage };
  }
}
