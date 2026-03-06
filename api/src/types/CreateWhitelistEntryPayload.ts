import { Field, ObjectType } from 'type-graphql';
import { WhitelistEntry } from '../models/WhitelistEntry';

@ObjectType()
export class CreateWhitelistEntryPayload {
  @Field()
  whitelistEntry: WhitelistEntry;
}