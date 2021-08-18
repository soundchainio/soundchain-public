import { Follow } from 'models/Follow';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UnfollowProfilePayload {
  @Field()
  follow: Follow;
}
