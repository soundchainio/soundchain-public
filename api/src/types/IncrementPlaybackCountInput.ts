import { Field, InputType } from 'type-graphql';
import { IncrementPlaybackCountTuple } from './IncrementPlaybackCountTuple';

@InputType()
export class IncrementPlaybackCountInput {
  @Field(() => [IncrementPlaybackCountTuple])
  values: IncrementPlaybackCountTuple[];
}
