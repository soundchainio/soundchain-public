import { Field, InputType } from 'type-graphql';
import { SortListingItemField } from './SortListingItemField';
import { SortOrder } from './SortOrder';

@InputType()
export class SortListingItemInput {
  @Field(() => SortListingItemField)
  field: SortListingItemField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
