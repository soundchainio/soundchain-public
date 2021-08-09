import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../../models/Profile';

@ObjectType()
export class UpdateSocialMediasPayload {
  @Field()
  profile: Profile;
}
