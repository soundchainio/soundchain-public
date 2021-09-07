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
  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() chat: Chat): Promise<Profile> {
    return profileService.getProfile(chat._id);
  }

  @FieldResolver()
  unread(@Root() chat: Chat): boolean {
    return chat.lastFromId !== '612e7862f206df3ad07b1aa9' && !chat.readAt;
  }

  @Query(() => ChatConnection)
  chats(
    @Ctx() { messageService }: Context,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ChatConnection> {
    return messageService.getChats('612e7862f206df3ad07b1aa9', page);
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
}
