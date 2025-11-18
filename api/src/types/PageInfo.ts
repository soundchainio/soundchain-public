import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PageInfo {
  @Field(() => Number)
  totalCount: number;

  @Field(() => Boolean)
  hasPreviousPage: boolean;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => String, { nullable: true })
  startCursor?: string;

  @Field(() => String, { nullable: true })
  endCursor?: string;
}
