import { Field, ObjectType } from 'type-graphql';
import { AudioHolder } from '../models/AudioHolder';

@ObjectType()
export class UpdateOgunClaimedAudioHolderPayload {
  @Field()
  audioHolder: AudioHolder;
}
