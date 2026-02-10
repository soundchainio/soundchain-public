import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateHdAccountInput {
  @Field()
  email: string; // Real email - used for future login via Email OTP

  @Field()
  handle: string; // Username (unique)

  @Field(() => String, { nullable: true })
  displayName?: string; // Optional display name
}
