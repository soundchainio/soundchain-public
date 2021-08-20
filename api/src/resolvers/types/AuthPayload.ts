import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AuthPayload {
  @Field()
  jwt: string;
}
