import { getModelForClass, prop, index } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Model } from './Model';

@index({ credentialID: 1 }, { unique: true })
@index({ userId: 1 })
export class PasskeyCredential extends Model {
  @prop({ type: mongoose.Types.ObjectId, required: true })
  userId: mongoose.Types.ObjectId;

  @prop({ required: true })
  credentialID: string; // Base64URL

  @prop({ required: true })
  publicKey: Buffer;

  @prop({ required: true, default: 0 })
  counter: number;

  @prop({ type: [String], default: [] })
  transports: string[];

  @prop({ required: false })
  deviceType?: string; // 'singleDevice' | 'multiDevice'

  @prop({ required: false, default: false })
  backedUp?: boolean;

  @prop({ required: false, default: 'Passkey' })
  friendlyName?: string;

  @prop({ required: false })
  lastUsedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PasskeyCredentialModel = getModelForClass(PasskeyCredential);
