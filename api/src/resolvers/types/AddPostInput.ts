import { Field, InputType } from 'type-graphql';

@InputType()
export default class AddPostInput {
  @Field()
  owner: string;

  @Field()
  textContent: string;

  @Field({ nullable: true })
  videoUrl: string;

}
