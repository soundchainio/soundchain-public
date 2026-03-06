import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PolygonscanResult {
  @Field(() => [PolygonscanResultObj])
  result: PolygonscanResultObj[];

  @Field({ nullable: true })
  nextPage: string;
}

@ObjectType()
export class PolygonscanResultObj {
  @Field(() => String)
  blockNumber: string;
  @Field(() => String)
  timeStamp: string;
  @Field(() => String)
  hash: string;
  @Field(() => String)
  nonce: string;
  @Field(() => String)
  blockHash: string;
  @Field(() => String)
  transactionIndex: string;
  @Field(() => String)
  from: string;
  @Field(() => String)
  to: string;
  @Field(() => String)
  value: string;
  @Field(() => String)
  gas: string;
  @Field(() => String)
  gasPrice: string;
  @Field(() => String)
  isError: string;
  @Field(() => String)
  txreceipt_status: string;
  @Field(() => String)
  input: string;
  @Field(() => String)
  contractAddress: string;
  @Field(() => String)
  cumulativeGasUsed: string;
  @Field(() => String)
  gasUsed: string;
  @Field(() => String)
  confirmations: string;
  @Field(() => String, { nullable: true })
  method: string;
  @Field(() => String)
  date: string;
}
