import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UploadUrlPayload {
  @Field()
  uploadUrl: string;

  @Field()
  fileName: string;

  @Field()
  readUrl: string;
}
