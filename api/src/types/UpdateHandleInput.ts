import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateHandleInput {
  @Field()
  handle: string;
}
