import { Field, InputType } from 'type-graphql';
import { SortOrder } from '../../enums/SortOrder';
import { SortPostField } from '../../enums/SortPostField';

@InputType()
export class SortPostInput {
  @Field(() => SortPostField)
  field: SortPostField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
