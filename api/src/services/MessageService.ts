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
    return this.paginateAggregated({
      filter: {
        $or: [
          {
            fromId: profileId,
          },
          {
            toId: profileId,
          },
        ],
      },
      group: {
        _id: {
          $cond: {
            if: {
              $eq: ['$fromId', profileId],
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
