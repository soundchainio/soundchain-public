import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreatePostInput {
  @Field()
  @MaxLength(160)
  body: string;

  @Field()
  mediaLink?: string;
}
