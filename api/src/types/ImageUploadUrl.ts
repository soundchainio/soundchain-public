import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ImageUploadUrl {
  @Field()
  uploadUrl: string;

  @Field()
  fileName: string;

  @Field()
  readUrl: string;
}
