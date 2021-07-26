import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export default class AuthPayload {
  @Field()
  jwt: string;
}
