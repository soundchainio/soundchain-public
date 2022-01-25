import { Field, InputType } from 'type-graphql';
import { SortNotificationField } from './SortNotificationField';
import { SortOrder } from './SortOrder';

@InputType()
export class SortNotificationInput {
  @Field(() => SortNotificationField)
  field: SortNotificationField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
