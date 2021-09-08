import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Message, MessageModel } from '../models/Message';
import { Profile, ProfileModel } from '../models/Profile';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface NewMessageParams {
  fromId: string;
  toId: string;
  message: string;
}

export class MessageService extends ModelService<typeof Message> {
  constructor(context: Context) {
    super(context, MessageModel);
  }

  async createMessage(params: NewMessageParams): Promise<Message> {
    const message = new this.model(params);
    await message.save();
    await this.incrementUnreadMessageCount(params.toId);
    return message;
  }

  getMessages(currentUser: string, otherUser: string, page?: PageInput): Promise<PaginateResult<Message>> {
    this.markAsRead(otherUser, currentUser);
    return this.paginate({
      filter: {
        $or: [
          { fromId: currentUser, toId: otherUser },
          { fromId: otherUser, toId: currentUser },
        ],
      },
      sort: { field: 'createdAt', order: SortOrder.ASC },
      page: { ...page, last: 25 },
    });
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
        lastFromId: {
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
      await this.decreaseUnreadMessageCount(toId, unreadMessageCount);
      await this.model.updateMany({ fromId, toId }, { $set: { readAt: new Date() } });
    } catch (err) {
      ok = false;
      throw new Error(`Error while mark as read: ${err}`);
    }
    return ok;
  }

  async incrementUnreadMessageCount(profileId: string): Promise<void> {
    await ProfileModel.updateOne({ _id: profileId }, { $inc: { unreadMessageCount: 1 } });
  }

  async decreaseUnreadMessageCount(profileId: string, count: number): Promise<void> {
    await ProfileModel.updateOne({ _id: profileId }, { $inc: { unreadMessageCount: -count } });
  }

  async resetUnreadMessageCount(profileId: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(profileId, { unreadMessageCount: 0 }, { new: true });
    if (!updatedProfile) {
      throw new NotFoundError('Profile', profileId);
    }
    return updatedProfile;
  }
}
