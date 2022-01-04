import { Field, ObjectType } from 'type-graphql';
import { Bid } from '../models/Bid';
import { Profile } from '../models/Profile';
import { User } from '../models/User';

@ObjectType()
export class BidsWithInfoPayload {
  @Field(() => BidsWithInfo, { nullable: true })
  bids: BidsWithInfo[];
}

@ObjectType()
class BidsWithInfo extends Bid {
  @Field(() => User)
  user: User;

  @Field(() => Profile)
  profile: Profile;
}
