import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';

@ObjectType()
export class UpdateCoverPicturePayload {
  @Field()
  profile: Profile;
}
