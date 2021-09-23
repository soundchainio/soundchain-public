import { Field, InputType } from 'type-graphql';

@InputType()
export class FeedItemInput {
  @Field()
  profileId: string;

  @Field()
  postId: string;

  @Field()
  postedAt: Date;
}
