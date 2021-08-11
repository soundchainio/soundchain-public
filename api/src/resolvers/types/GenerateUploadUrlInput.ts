import { Field, InputType } from 'type-graphql';

@InputType()
export class GenerateUploadUrlInput {
  @Field()
  extension: string;
}
