import { Field, InputType } from 'type-graphql';

@InputType()
export class DeleteTrackInput {
  @Field()
  trackId: string;
}
