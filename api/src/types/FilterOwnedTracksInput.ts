import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterOwnedTracksInput {
  @Field()
  trackEditionId: string;

  @Field()
  owner: string;
}
