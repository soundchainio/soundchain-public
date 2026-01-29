import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateNotificationSettingsInput {
  @Field(() => String, { nullable: true })
  phoneNumber?: string;

  @Field(() => Boolean, { nullable: true })
  notifyOnFollow?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnLike?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnComment?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnSale?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnTip?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnDM?: boolean;

  @Field(() => String, { nullable: true })
  nostrPubkey?: string;

  @Field(() => Boolean, { nullable: true })
  notifyViaNostr?: boolean;
}
