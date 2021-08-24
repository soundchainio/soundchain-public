import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateRepostInput {
  @Field()
  body: string;

  @Field()
  repostId: string;
}
