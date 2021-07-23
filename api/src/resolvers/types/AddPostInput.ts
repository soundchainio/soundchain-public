import { Field, InputType } from 'type-graphql';

@InputType()
export default class AddPostInput {
  @Field()
  author: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  embedUrl: string;

}
