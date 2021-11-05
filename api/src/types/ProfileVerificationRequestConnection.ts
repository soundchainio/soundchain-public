import { Field, ObjectType } from 'type-graphql';
import { ProfileVerificationRequest } from '../models/ProfileVerificationRequest';
import { PageInfo } from './PageInfo';

@ObjectType()
export class ProfileVerificationRequestConnection {
  @Field()
  pageInfo: PageInfo;

  @Field(() => [ProfileVerificationRequest])
  nodes: ProfileVerificationRequest[];
}
