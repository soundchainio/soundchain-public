import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateTrackInput {
  @Field()
  title: string;

  @Field()
  audioUrl: string;
}
