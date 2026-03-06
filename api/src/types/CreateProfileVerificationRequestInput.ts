import { Field, InputType } from 'type-graphql';
import { ProfileVerificationStatusType } from './ProfileVerificationStatusType';

@InputType()
export class CreateProfileVerificationRequestInput {
  @Field(() => String, { nullable: true })
  soundcloud?: string;

  @Field(() => String, { nullable: true })
  youtube?: string;

  @Field(() => String, { nullable: true })
  bandcamp?: string;

  @Field(() => ProfileVerificationStatusType, { nullable: true })
  status?: ProfileVerificationStatusType;

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => String, { nullable: true })
  reviewerProfileId?: string;
}