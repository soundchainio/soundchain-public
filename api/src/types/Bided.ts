import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class Bided {
  @Field()
  bided!: boolean;
}
