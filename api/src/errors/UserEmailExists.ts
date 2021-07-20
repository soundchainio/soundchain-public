import { UserInputError } from 'apollo-server';

export default class UserEmailExists extends UserInputError {
  constructor(email: string) {
    super(`UserEmailExists error: ${email} is in use`);
  }
}
