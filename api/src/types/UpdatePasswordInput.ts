import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdatePasswordInput {
  @Field()
  password: string;
}