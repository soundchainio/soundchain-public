import { Max, Min } from 'class-validator';
import { Field, InputType, Int } from 'type-graphql';

@InputType()
export class PageInput {
  @Min(1)
  @Max(200)
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;

  @Min(1)
  @Max(25)
  @Field(() => Int, { nullable: true })
  last?: number;

  @Field(() => String, { nullable: true })
  before?: string;

  @Field(() => Boolean, { defaultValue: false })
  inclusive?: boolean;
}
