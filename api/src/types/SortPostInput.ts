import { Field, InputType } from 'type-graphql';
import { SortOrder } from './SortOrder';
import { SortPostField } from './SortPostField';

@InputType()
export class SortPostInput {
  @Field(() => SortPostField)
  field: SortPostField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
