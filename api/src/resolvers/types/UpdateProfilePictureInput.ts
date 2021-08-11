import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateProfilePictureInput {
  @Field()
  profilePicture: string;
}
