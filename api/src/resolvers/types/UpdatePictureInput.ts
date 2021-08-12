import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdatePictureInput {
  @Field()
  picture: string;
}
