import { DocumentType } from '@typegoose/typegoose';
import User, { UserModel } from '../models/User';

export class UserService {
  static getUser(id: string): Promise<User> {
    return UserModel.findByIdOrFail(id);
  }

  static userExists(filter: { passwordResetToken?: string }): Promise<boolean> {
    return UserModel.exists(filter);
  }

  static findUser(filter: { passwordResetToken?: string; email?: string }): Promise<DocumentType<User> | null> {
    return UserModel.findOne(filter).exec();
  }
}
