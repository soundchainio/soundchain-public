import { WhitelistEntry, WhitelistEntryModel } from '../models/WhitelistEntry';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface NewWhitelistEntryParams {
  walletAddress: string;
  emailAddress: string;
}

export class WhitelistEntryService extends ModelService<typeof WhitelistEntry> {
  constructor(context: Context) {
    super(context, WhitelistEntryModel);
  }

  async createWhitelistEntry(params: NewWhitelistEntryParams): Promise<WhitelistEntry> {
    const whitelistEntry = new this.model(params);
    await whitelistEntry.save();
    return whitelistEntry;
  }
}