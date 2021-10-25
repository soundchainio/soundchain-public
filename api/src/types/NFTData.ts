import { modelOptions, prop } from '@typegoose/typegoose';
import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType('NFTDataType')
@InputType('NFTDataInput')
@modelOptions({ schemaOptions: { _id: false } })
export class NFTData {
  @Field({ nullable: true })
  @prop()
  transactionHash: string;

  @Field({ nullable: true })
  @prop()
  ipfsCid: string;

  @Field({ nullable: true })
  @prop()
  tokenId: number;

  @Field({ nullable: true })
  @prop()
  contract: string;

  @Field({ nullable: true })
  @prop()
  minter: string;

  @Field({ nullable: true })
  @prop()
  quantity: number;
}
