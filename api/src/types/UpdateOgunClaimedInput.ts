import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateOgunClaimedInput {
  @Field()
  id: string;

  @Field()
  ogunClaimed: boolean;
}
