import { PaginateResult } from '../db/pagination/paginate';
import { Message, MessageModel } from '../models/Message';
import { Context } from '../types/Context';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { SortPostInput } from '../types/SortPostInput';
import { ModelService } from './ModelService';

interface NewMessageParams {
  from: string;
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

  getConversation(recipient: string, otherRecipient: string, page?: PageInput): Promise<PaginateResult<Message>> {
    return this.paginate({
      filter: {
        $or: [
          { from: recipient, to: otherRecipient },
          { from: otherRecipient, to: recipient },
        ],
      },
      sort: { field: 'createdAt', order: SortOrder.ASC },
      page: { ...page, last: 15 },
    });
  }

  getMessages(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Message>> {
    return this.paginate({ filter, sort, page });
  }

  getMessage(id: string): Promise<Message> {
    return this.findOrFail(id);
  }
}
