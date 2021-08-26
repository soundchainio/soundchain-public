import { IsOptional, Validate } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { CustomTextLength } from '../validators/CustomTextLength';

@InputType()
export class CreatePostInput {
  @Field()
  @Validate(CustomTextLength, {
    message: 'Text is too long',
  })
  body: string;

  @Field({ nullable: true })
  @IsOptional()
  mediaLink?: string;
}
