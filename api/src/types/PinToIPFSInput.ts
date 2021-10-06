import { Field, InputType } from 'type-graphql';

@InputType()
export class PinToIPFSInput {
  @Field()
  fileName: string;

  @Field()
  fileKey: string;
}
