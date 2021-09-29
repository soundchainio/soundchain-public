import { Field, ObjectType } from 'type-graphql';
import { MintingRequest } from '../models/MintingRequest';

@ObjectType()
export class MintingRequestPayload {
  @Field()
  mintingRequest: MintingRequest;
}
