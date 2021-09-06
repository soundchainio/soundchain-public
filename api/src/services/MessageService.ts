import { PaginateResult } from '../db/pagination/paginate';
import { Message, MessageModel } from '../models/Message';
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
    return message;
  }

  getMessages(currentUser: string, otherUser: string, page?: PageInput): Promise<PaginateResult<Message>> {
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
      },
      sort: { field: 'createdAt', order: SortOrder.DESC },
      page,
    });
  }
}
