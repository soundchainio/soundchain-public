import { Field, InputType } from 'type-graphql';

@InputType()
export class IncrementPlaybackCountTuple {
  @Field()
  trackId: string;

  @Field()
  amount: number;
}
