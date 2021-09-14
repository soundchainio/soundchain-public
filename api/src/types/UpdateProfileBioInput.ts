import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateProfileBioInput {
  @Field()
  bio: string;
}
