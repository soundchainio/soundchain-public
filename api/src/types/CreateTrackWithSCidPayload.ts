import { Field, ObjectType } from 'type-graphql';
import { Track } from '../models/Track';
import { SCid } from '../models/SCid';

/**
 * Payload returned when creating a track with SCid (no NFT)
 * Includes both the track and the auto-generated SCid
 */
@ObjectType()
export class CreateTrackWithSCidPayload {
  @Field()
  track: Track;

  @Field(() => SCid, { nullable: true })
  scid?: SCid;

  @Field(() => String)
  message: string;
}
