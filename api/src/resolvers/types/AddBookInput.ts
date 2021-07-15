import { Field, InputType } from 'type-graphql';

@InputType()
export default class AddBookInput {
  @Field()
  title: string;
}
