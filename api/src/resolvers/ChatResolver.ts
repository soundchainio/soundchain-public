import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { Profile } from '../models/Profile';
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

  @Query(() => ChatConnection)
  chats(
    @Ctx() { messageService }: Context,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ChatConnection> {
    return messageService.getChats('612e7862f206df3ad07b1aa9', page);
  }
}
