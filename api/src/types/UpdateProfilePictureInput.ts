import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateProfilePictureInput {
  @Field({ nullable: true })
  profilePicture?: string;

  @Field({ nullable: true })
  defaultProfilePicture?: string;
}
