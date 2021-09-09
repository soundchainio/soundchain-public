import { ArrayUnique } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { MusicianType } from './MusicianTypes';

@InputType()
export class UpdateMusicianTypeInput {
  @ArrayUnique()
  @Field(() => [MusicianType])
  musicianTypes: MusicianType[];
}
