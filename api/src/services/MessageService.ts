import { PaginateResult } from '../db/pagination/paginate';
import { Message, MessageModel } from '../models/Message';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface NewMessageParams {
  profileId: string;
  to: string;
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

  getChat(currentUser: string, otherUser: string, page?: PageInput): Promise<PaginateResult<Message>> {
    return this.paginate({
      filter: {
        $or: [
          { profileId: currentUser, to: otherUser },
          { profileId: otherUser, to: currentUser },
        ],
      },
      sort: { field: 'createdAt', order: SortOrder.ASC },
      page: { ...page, last: 25 },
    });
  }

  getMessage(id: string): Promise<Message> {
    return this.findOrFail(id);
  }
}
