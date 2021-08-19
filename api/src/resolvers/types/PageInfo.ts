import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PageInfo {
  @Field()
  totalCount: number;

  @Field()
  hasPreviousPage: boolean;

  @Field()
  hasNextPage: boolean;

  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;
}
