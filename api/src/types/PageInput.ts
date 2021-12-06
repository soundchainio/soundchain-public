import { Max, Min } from 'class-validator';
import { Field, InputType, Int } from 'type-graphql';

@InputType()
export class PageInput {
  @Min(1)
  @Max(50)
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field({ nullable: true })
  after?: string;

  @Min(1)
  @Max(100)
  @Field(() => Int, { nullable: true })
  last?: number;

  @Field({ nullable: true })
  before?: string;

  @Field({ defaultValue: false })
  inclusive?: boolean;
}
