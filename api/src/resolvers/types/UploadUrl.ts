import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UploadUrl {
  @Field()
  uploadUrl: string;

  @Field()
  fileName: string;

  @Field()
  readUrl: string;
}
