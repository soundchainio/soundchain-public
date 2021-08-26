import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterPostInput {
  @Field({ nullable: true })
  profileId?: string;
}
