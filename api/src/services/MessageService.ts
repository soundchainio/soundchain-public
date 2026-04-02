import mongoose from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { Message, MessageModel } from '../models/Message';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface NewMessageParams {
  fromId: mongoose.Types.ObjectId;
  toId: mongoose.Types.ObjectId;
  message: string;
}

export class MessageService extends ModelService<typeof Message> {
  constructor(context: Context) {
    super(context, MessageModel);
  }

  async createMessage(params: NewMessageParams): Promise<Message> {
    const message = new this.model(params);
    await message.save();
    await this.context.profileService.incrementUnreadMessageCount(params.toId.toString());

    // Send push notification for new DM
    try {
      const senderProfile = await this.context.profileService.getProfile(params.fromId.toString());
      const senderName = senderProfile?.displayName || 'Someone';
      await this.context.webPushService.notifyNewDM(params.toId.toString(), senderName, params.message);
    } catch (err) {
      // Don't block message delivery if push fails
      console.error('[MessageService] Push notification failed:', err);
    }

    return message;
  }

  async getMessages(currentUser: string, otherUser: string, page?: PageInput): Promise<PaginateResult<Message>> {
    const [messages] = await Promise.all([
      this.paginate({
        filter: {
          $or: [
            { fromId: currentUser, toId: otherUser },
            { fromId: otherUser, toId: currentUser },
          ],
        },
        sort: { field: 'createdAt', order: SortOrder.ASC },
        page: { ...page, last: 25 },
      }),
      this.markAsRead(otherUser, currentUser),
    ]);

    return messages;
  }

  getMessage(id: string): Promise<Message> {
    return this.findOrFail(id);
  }

  getChats(profileId: string, page?: PageInput): Promise<PaginateResult<Message>> {
    // Match both ObjectId and string formats — Atlas migration may have mixed types
    const profileObjectId = new mongoose.Types.ObjectId(profileId);
    const profileString = profileId.toString();

    return this.paginateAggregated({
      filter: {
        $or: [
          { fromId: profileObjectId },
          { toId: profileObjectId },
          { fromId: profileString },
          { toId: profileString },
        ],
      },
      group: {
        _id: {
          $cond: {
            if: {
              $or: [
                { $eq: ['$fromId', profileObjectId] },
                { $eq: ['$fromId', profileString] },
              ],
            },
            then: '$toId',
            else: '$fromId',
          },
        },
        createdAt: {
          $last: '$createdAt',
        },
        message: {
          $last: '$message',
        },
        fromId: {
          $last: '$fromId',
        },
        readAt: {
          $last: '$readAt',
        },
      },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }

  async markAsRead(fromId: string, toId: string): Promise<boolean> {
    let ok = true;
    try {
      const unreadMessageCount = await this.model.find({ fromId, toId, readAt: null }).countDocuments();
      await this.context.profileService.decreaseUnreadMessageCount(toId, unreadMessageCount);
      await this.model.updateMany({ fromId, toId }, { $set: { readAt: new Date() } });
    } catch (err) {
      ok = false;
      throw new Error(`Error while mark as read: ${err}`);
    }
    return ok;
  }
}
