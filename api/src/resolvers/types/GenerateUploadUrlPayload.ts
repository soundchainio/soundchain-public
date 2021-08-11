import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class GenerateUploadUrlPayload {
  @Field()
  uploadUrl: string;

  @Field()
  fileName: string;

  @Field()
  readUrl: string;
}
