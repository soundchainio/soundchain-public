import { Field, ObjectType } from 'type-graphql';
import { AudioHolder } from '../models/AudioHolder';

@ObjectType()
export class CreateAudioHolderPayload {
  @Field()
  audioHolder: AudioHolder;
}
