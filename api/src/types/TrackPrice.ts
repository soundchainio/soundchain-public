import { Field, ObjectType } from 'type-graphql';
import { CurrencyType } from './CurrencyType';
@ObjectType()
export class TrackPrice {
  @Field(() => Number)
  value: number

  @Field(() => CurrencyType)
  currency: CurrencyType
}