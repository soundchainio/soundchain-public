import { Field, InputType } from 'type-graphql';
import { SortOrder } from './SortOrder';
import { SortTrackField } from './SortTrackField';

@InputType()
export class SortTrackInput {
  @Field(() => SortTrackField)
  field: SortTrackField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
