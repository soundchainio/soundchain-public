import { Field, InputType } from 'type-graphql';
import { SortOrder } from '../types/SortOrder';
import { SortPlaylistField } from '../types/SortPlaylistField';

@InputType()
export class SortPlaylistInput {
  @Field(() => SortPlaylistField)
  field: SortPlaylistField;

  @Field(() => SortOrder, { nullable: true })
  order?: SortOrder;
}
