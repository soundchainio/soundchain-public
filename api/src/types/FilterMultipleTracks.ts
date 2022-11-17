import { Field, InputType } from 'type-graphql';
import { NFTData } from './NFTData';

@InputType()
export class FilterMultipleTracks {
  @Field({ nullable: true })
  profileId?: string;

  @Field({ nullable: true })
  trackEditionIds?: string[];
}
