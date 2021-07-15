import { UserInputError } from 'apollo-server';

export default class NotFoundError extends UserInputError {
  constructor(model: string, id: string) {
    super(`${model} not found with id ${id}`);
  }
}
