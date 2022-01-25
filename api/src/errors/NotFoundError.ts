import { UserInputError } from 'apollo-server-express';

export class NotFoundError extends UserInputError {
  constructor(model: string, id: string) {
    super(`${model} not found with id ${id}`);
  }
}
