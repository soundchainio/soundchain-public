import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateCoverPictureInput {
  @Field()
  picture: string;
}
