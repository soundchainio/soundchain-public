import { Field, ObjectType } from 'type-graphql';
import { WhitelistEntry } from '../models/WhitelistEntry';

@ObjectType()
export class UpdateWhitelistEntryPayload {
  @Field()
  whitelistEntry: WhitelistEntry;
}
