import { Field, ObjectType } from 'type-graphql';
import { Story } from '../models/Story';

@ObjectType()
export class MakeStoryPermanentResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Story, { nullable: true })
  story?: Story;
}
