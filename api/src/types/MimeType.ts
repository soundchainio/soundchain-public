import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class MimeType {
  @Field()
  value: string;
}
