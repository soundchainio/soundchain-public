import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateOgunClaimedInput {
  @Field(() => String)
  id: string;

  @Field(() => Boolean)
  ogunClaimed: boolean;
}
