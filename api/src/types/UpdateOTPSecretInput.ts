import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateOTPSecretInput {
  @Field()
  otpSecret: string;
}
