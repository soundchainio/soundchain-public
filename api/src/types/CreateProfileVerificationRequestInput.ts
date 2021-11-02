import { Field, InputType } from 'type-graphql';
import { ProfileVerificationStatusType } from './ProfileVerificationStatusType';

@InputType()
export class CreateProfileVerificationRequestInput {
  @Field({ nullable: true })
  soundcloud?: string;

  @Field({ nullable: true })
  youtube?: string;

  @Field({ nullable: true })
  bandcamp?: string;

  @Field({ nullable: true })
  status?: ProfileVerificationStatusType;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  reviewerProfileId?: string;
}
