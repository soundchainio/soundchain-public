import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterTrackInput {
  @Field({ nullable: true })
  profileId?: string;
}
