import { Profile } from 'models/Profile';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UpdateProfilePicturePayload {
  @Field()
  profile: Profile;
}
