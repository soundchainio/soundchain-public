import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Chat } from '../types/Chat';
import { ChatConnection } from '../types/ChatConnection';
import { Context } from '../types/Context';
import { MessageConnection } from '../types/MessageConnection';
import { PageInput } from '../types/PageInput';

@Resolver(Chat)
export class ChatResolver {
  @FieldResolver(() => Profile, { nullable: true })
  async profile(@Ctx() { profileService }: Context, @Root() chat: Chat): Promise<Profile | null> {
    try {
      return await profileService.getProfile(chat._id.toString());
    } catch {
      // Partner profile may have been deleted — return null instead of crashing entire chat list
      return null;
    }
  }

  @FieldResolver()
  unread(@CurrentUser() { profileId }: User, @Root() chat: Chat): boolean {
    return chat.fromId.toString() !== profileId.toString() && !chat.readAt;
  }

  @Authorized()
  @Query(() => ChatConnection)
  async chats(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ChatConnection> {
    const messages = await messageService.getChats(profileId.toString(), page);
    // Transform PaginateResult<Message> to ChatConnection
    return {
      pageInfo: messages.pageInfo,
      nodes: messages.nodes
        .filter(message => message._id) // Skip null grouped results
        .map(message => ({
          _id: message._id.toString(),
          fromId: message.fromId?.toString() || '',
          readAt: message.readAt,
          message: message.message || '',
          createdAt: message.createdAt,
        })),
    };
  }

  @Authorized()
  @Query(() => MessageConnection)
  chatHistory(
    @Ctx() { messageService }: Context,
    @CurrentUser() { profileId: currentUserProfileId }: User,
    @Arg('profileId') profileId: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<MessageConnection> {
    return messageService.getMessages(currentUserProfileId.toString(), profileId, page);
  }
}
