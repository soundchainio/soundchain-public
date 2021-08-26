import { Validate } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { CustomTextLength } from '../validators/CustomTextLength';

@InputType()
export class SendMessageInput {
  @Field()
  @Validate(CustomTextLength, {
    message: 'Text is too long',
  })
  message: string;

  @Field()
  to: string;
}
