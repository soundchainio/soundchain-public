import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ClearNotificationsPayload {
  @Field()
  success: boolean;
}
