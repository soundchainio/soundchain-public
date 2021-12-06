import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class Bided {
  @Field({ nullable: true })
  bided: boolean;
}
