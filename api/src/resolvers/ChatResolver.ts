import { Arg, Authorized, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Chat } from '../types/Chat';
import { ChatConnection } from '../types/ChatConnection';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';

@Resolver(Chat)
export class ChatResolver {
  @FieldResolver(() => Profile)
  profile(@Ctx() { profileService }: Context, @Root() chat: Chat): Promise<Profile> {
    return profileService.getProfile(chat._id);
  }

  @FieldResolver()
  unread(@CurrentUser() { profileId }: User, @Root() chat: Chat): boolean {
    return !chat.readProfileIds.includes(profileId);
  }

  @Authorized()
  @Query(() => ChatConnection)
  chats(
    @CurrentUser() { profileId }: User,
    @Ctx() { messageService }: Context,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ChatConnection> {
    return messageService.getChats(profileId, page);
  }
}
