import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateProfileDisplayNameInput {
  @Field()
  displayName: string;
}
