import { ArgumentValidationError } from 'type-graphql';
import { UserModel } from '../models/User';

export const handleRegex = /^[a-zA-Z0-9_\-.]*$/;

export async function validateUniqueIdentifiers({
  id,
  handle,
}: {
  id?: string;
  handle: string;
}): Promise<ArgumentValidationError> {
  let existingUsers;

  if (id) {
    existingUsers = await UserModel.findOne({
      $text: { $search: handle, $caseSensitive: false },
      _id: { $ne: id },
    });
  } else {
    existingUsers = await UserModel.findOne({
      $text: { $search: handle, $caseSensitive: false },
    });
  }

  if (existingUsers) {
    const errors = [];
    errors.push({ property: 'handle', constraints: { unique: `${handle} is already in use` } });
    throw new ArgumentValidationError(errors);
  }
  return null;
}
