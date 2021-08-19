import { SortOrder } from 'enums/SortOrder';
import { SortPostField } from 'enums/SortPostField';
import { Field, InputType } from 'type-graphql';

@InputType()
export class SortPostInput {
  @Field(() => SortPostField)
  field: SortPostField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
