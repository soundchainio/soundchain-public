import { IsOptional } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreatePostInput {
  @Field()
  body: string;

  @Field({ nullable: true })
  @IsOptional()
  mediaLink?: string;
}
