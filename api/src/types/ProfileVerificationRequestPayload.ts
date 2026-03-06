import { Field, ObjectType } from 'type-graphql';
import { ProfileVerificationRequest } from '../models/ProfileVerificationRequest';

@ObjectType()
export class ProfileVerificationRequestPayload {
  @Field(() => ProfileVerificationRequest)
  profileVerificationRequest?: ProfileVerificationRequest;
}
