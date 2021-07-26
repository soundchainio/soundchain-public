import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export default class AddPostInput {
  @Field()
  author: string;

  @Field()
  @MaxLength(160)
  body: string;
}
