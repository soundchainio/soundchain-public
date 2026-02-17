import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ProfileViewCountResult {
  @Field(() => Number)
  total: number;

  @Field(() => Number)
  today: number;
}
