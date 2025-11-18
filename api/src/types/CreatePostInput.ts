import { IsOptional, Validate } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { CustomTextLength } from '../validators/CustomTextLength';

@InputType()
export class CreatePostInput {
  @Field(() => String)
  @Validate(CustomTextLength, {
    message: 'Text is too long',
  })
  body: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  mediaLink?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  trackId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  trackEditionId?: string;
}
