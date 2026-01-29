import { Field, InputType } from 'type-graphql';

@InputType()
export class LoginWithWalletInput {
  @Field()
  walletAddress: string;  // 0x... Ethereum address

  @Field()
  signature: string;      // Signed message from wallet

  @Field()
  message: string;        // Original message that was signed

  @Field(() => String, { nullable: true })
  handle?: string;        // Optional - auto-generate if not provided

  @Field(() => String, { nullable: true })
  displayName?: string;   // Optional - default to wallet prefix
}
