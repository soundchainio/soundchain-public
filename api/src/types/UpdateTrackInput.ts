import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateTrackInput {
  @Field()
  trackId: string;

  @Field({ nullable: true })
  transactionAddress: string;
}
