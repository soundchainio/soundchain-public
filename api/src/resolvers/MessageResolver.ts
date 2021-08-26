import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { MessageConnection } from '../types/MessageConnection';
import { PageInput } from '../types/PageInput';
import { SendMessageInput } from '../types/SendMessageInput';

@Resolver(Message)
export class MessageResolver {
  @Authorized()
  @Query(() => MessageConnection)
  conversation(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('recipient') recipient: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<MessageConnection> {
    return messageService.getConversation(profileId, recipient, page);
  }

  @Authorized()
  @Mutation(() => Message)
  sendMessage(
    @Ctx() { messageService }: Context,
    @Arg('input') { message, to }: SendMessageInput,
    @CurrentUser() { profileId }: User,
  ): Promise<Message> {
    return messageService.createMessage({ from: profileId, to, message });
  }
}
