import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class HdAccountPayload {
  @Field()
  jwt: string;

  @Field()
  hdWalletAddress: string; // The generated HD wallet address (Polygon/EVM)

  @Field()
  handle: string; // Confirmed username
}
