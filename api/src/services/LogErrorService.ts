import { LogError, LogErrorModel } from '../models/LogError';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class LogErrorService extends ModelService<typeof LogError> {
  constructor(context: Context) {
    super(context, LogErrorModel);
  }

  async createLogError(title: string, description: string): Promise<LogError> {
    const logError = new this.model({ title, description });
    await logError.save();
    return logError;
  }
}
