import { Field, ObjectType } from 'type-graphql';
import { Profile } from '../models/Profile';

@ObjectType()
export class SubscribeToProfilePayload {
  @Field()
  profile: Profile;
}
