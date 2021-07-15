import { Query, Resolver } from 'type-graphql';
import Book from '../models/Book';

@Resolver(Book)
export default class BookResolver {
  @Query(() => [Book])
  books() {
    return [];
  }
}
