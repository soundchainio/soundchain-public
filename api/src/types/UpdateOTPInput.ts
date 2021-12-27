import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateOTPInput {
  @Field()
  otpSecret: string;

  @Field()
  otpRecoveryPhrase: string;
}
