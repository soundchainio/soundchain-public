import { UserInputError } from 'apollo-server-express';

export class NotAuthorizedError extends UserInputError {
  constructor(model: string, id: string, profileId: string) {
    super(`User ${profileId} not authorized to view ${model} with id ${id}`);
  }
}
