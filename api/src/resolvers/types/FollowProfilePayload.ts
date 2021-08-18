import { Follow } from 'models/Follow';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class FollowProfilePayload {
  @Field()
  follow: Follow;
}
