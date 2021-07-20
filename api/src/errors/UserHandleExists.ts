import { UserInputError } from 'apollo-server';

export default class UserHandleExists extends UserInputError {
  constructor(handle: string) {
    super(`UserHandleExists error: ${handle} is in use`);
  }
}
