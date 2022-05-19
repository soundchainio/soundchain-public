import { Field, InputType } from 'type-graphql';
import { SortExploreTracksField } from './SortExploreTracksField';
import { SortOrder } from './SortOrder';

@InputType()
export class SortExploreTracks {
  @Field(() => SortExploreTracksField)
  field: SortExploreTracksField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
