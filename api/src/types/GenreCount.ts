import { Field, Int, ObjectType } from 'type-graphql';

@ObjectType()
export class GenreCount {
  @Field(() => String)
  genre: string;

  @Field(() => Int)
  count: number;
}
