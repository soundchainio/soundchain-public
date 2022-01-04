import { Field, ObjectType } from 'type-graphql';
import { Bid } from '../models/Bid';
import { Profile } from '../models/Profile';

@ObjectType()
export class BidsWithInfoPayload {
  @Field(() => [BidsWithInfo], { nullable: true })
  bids: BidsWithInfo[];
}

@ObjectType()
class BidsWithInfo extends Bid {
  @Field(() => Profile)
  profile: Profile;
}
