import GraphQLJSON from 'graphql-type-json';
import { Field, InputType } from 'type-graphql';

@InputType()
export class PinJsonToIPFSInput {
  @Field()
  fileName: string;

  @Field(type => GraphQLJSON)
  json: unknown;
}
