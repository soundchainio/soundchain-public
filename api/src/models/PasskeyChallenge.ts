import { getModelForClass, prop, index } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Model } from './Model';

@index({ createdAt: 1 }, { expireAfterSeconds: 300 }) // TTL: 5 minutes
@index({ sessionId: 1 }, { unique: true })
export class PasskeyChallenge extends Model {
  @prop({ required: true })
  sessionId: string;

  @prop({ required: true })
  challenge: string;

  @prop({ type: mongoose.Types.ObjectId, required: false })
  userId?: mongoose.Types.ObjectId;

  @prop({ required: true })
  type: string; // 'registration' | 'authentication'

  createdAt: Date;
}

export const PasskeyChallengeModel = getModelForClass(PasskeyChallenge);
