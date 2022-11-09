import { Field, InputType } from 'type-graphql';

@InputType()
export class FilterGetPlaylist {
  @Field({ nullable: true })
  profileId?: string;
}
