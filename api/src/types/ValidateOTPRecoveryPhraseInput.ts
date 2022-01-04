import { Field, InputType } from 'type-graphql';

@InputType()
export class ValidateOTPRecoveryPhraseInput {
  @Field()
  otpRecoveryPhrase: string;
}
