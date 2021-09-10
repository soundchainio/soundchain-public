import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UpdatePasswordPayload {
  @Field()
  ok: boolean;
}
