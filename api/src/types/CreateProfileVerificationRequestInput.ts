import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateProfileVerificationRequestInput {
  @Field({ nullable: true })
  soundcloud?: string;

  @Field({ nullable: true })
  youtube?: string;

  @Field({ nullable: true })
  bandcamp?: string;
}
