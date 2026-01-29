import { Field, InputType, registerEnumType } from 'type-graphql';

export enum PaymentToken {
  OGUN = 'OGUN',
  POL = 'POL',
}

registerEnumType(PaymentToken, {
  name: 'PaymentToken',
  description: 'Token used for payment',
});

@InputType()
export class MakePostPermanentInput {
  @Field(() => String)
  postId!: string;

  @Field(() => PaymentToken)
  paymentToken!: PaymentToken;

  @Field(() => String)
  transactionHash!: string;

  @Field(() => Number)
  amountPaid!: number;
}

@InputType()
export class RemoveFromPermanentInput {
  @Field(() => String)
  postId!: string;

  @Field(() => PaymentToken)
  paymentToken!: PaymentToken;

  @Field(() => String)
  transactionHash!: string;

  @Field(() => Number)
  amountPaid!: number;
}
