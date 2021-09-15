import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AudioUpload {
  @Field()
  url: string;

  @Field()
  id: string;
}
