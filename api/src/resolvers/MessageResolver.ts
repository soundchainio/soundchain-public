import { ApolloError } from 'apollo-server-express';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Message } from '../models/Message';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { ConversationConnection } from '../types/MessageConnection';
import { PageInput } from '../types/PageInput';
import { SendMessageInput } from '../types/SendMessageInput';
import { SendMessagePayload } from '../types/SendMessagePayload';

@Resolver(Message)
export class MessageResolver {
  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() message: Message): Promise<Profile> {
    return profileService.getProfile(message.from);
  }

  @Authorized()
  @Query(() => ConversationConnection)
  conversation(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('recipient') recipient: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ConversationConnection> {
    return messageService.getConversation(profileId, recipient, page);
  }

  @Authorized()
  @Query(() => Message)
  async message(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<Message> {
    const message = await messageService.getMessage(id);
    if (!(message.to === profileId || message.from === profileId)) throw new ApolloError('Not authorized');
    return message;
  }

  @Authorized()
  @Mutation(() => SendMessagePayload)
  async sendMessage(
    @Ctx() { messageService }: Context,
    @Arg('input') { message, to }: SendMessageInput,
    @CurrentUser() { profileId }: User,
  ): Promise<SendMessagePayload> {
    const newMessage = await messageService.createMessage({ from: profileId, to, message });
    return { message: newMessage };
  }
}
