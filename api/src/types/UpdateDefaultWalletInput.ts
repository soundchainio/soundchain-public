import { Field, InputType } from 'type-graphql';
import { DefaultWallet } from './DefaultWallet';

@InputType()
export class UpdateDefaultWalletInput {
  @Field(() => DefaultWallet)
  defaultWallet: DefaultWallet;
}
