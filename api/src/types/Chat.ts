import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Chat {
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Field()
  message: string;

  @Field(() => Date)
  createdAt: Date;
}
