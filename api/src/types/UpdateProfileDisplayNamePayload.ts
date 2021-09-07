import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';

@ObjectType()
export class UpdateProfileDisplayNamePayload {
  @Field()
  profile: Profile;
}
