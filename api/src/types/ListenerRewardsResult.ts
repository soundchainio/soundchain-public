import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ListenerRewardsResult {
  @Field(() => Number)
  dailyEarned: number;

  @Field(() => Number)
  totalEarned: number;

  @Field(() => Number)
  dailyLimit: number;

  @Field(() => Number)
  tracksStreamedToday: number;
}
