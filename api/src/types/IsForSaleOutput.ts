import { Field, ObjectType } from 'type-graphql';

@ObjectType('IsForSaleOutput')
export class IsForSaleOutput {
  @Field()
  is: boolean;
}
