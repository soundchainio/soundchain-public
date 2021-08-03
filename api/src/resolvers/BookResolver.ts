import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import Book, { BookModel } from '../models/Book';
import AddBookInput from './types/AddBookInput';
import AddBookPayload from './types/AddBookPayload';

@Resolver(Book)
export class BookResolver {
  @Query(() => Book)
  book(@Arg('id') id: string): Promise<Book> {
    return BookModel.findByIdOrFail(id);
  }

  @Query(() => [Book])
  books(): Promise<Book[]> {
    return BookModel.find().exec();
  }

  @Mutation(() => AddBookPayload)
  async addBook(@Arg('input') input: AddBookInput): Promise<AddBookPayload> {
    const book = new BookModel(input as Book);
    await book.save();
    return { book };
  }
}
