import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export default class Book {
  @Field(() => ID)
  id: string;
}
