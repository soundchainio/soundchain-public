import { Field, ObjectType } from 'type-graphql';
import Book from '../../models/Book';

@ObjectType()
export default class AddBookPayload {
  @Field()
  book: Book;
}
