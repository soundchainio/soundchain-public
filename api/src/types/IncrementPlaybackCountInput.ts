import { Field, InputType } from 'type-graphql';

@InputType()
export class IncrementPlaybackCountInput {
  @Field()
  trackId: string;

  @Field({ nullable: true })
  amount: number;
}
