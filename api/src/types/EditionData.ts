import { modelOptions, prop } from '@typegoose/typegoose';
import { Field, InputType, ObjectType } from 'type-graphql';
import { PendingRequest } from './PendingRequest';

@ObjectType('EditionDataType')
@InputType('EditionDataInput')
@modelOptions({ schemaOptions: { _id: false } })
export class EditionData {
  @Field({ nullable: true })
  @prop()
  transactionHash: string;

  @Field(() => PendingRequest, { defaultValue: PendingRequest.None })
  @prop({ type: String, enum: PendingRequest, default: PendingRequest.None })
  pendingRequest: PendingRequest;

  @Field(() => Date, { nullable: true })
  @prop()
  pendingTime?: Date;

  @Field({ nullable: true })
  @prop()
  contract: string;

  @Field({ nullable: true })
  @prop()
  owner: string;
}
