import { Field, InputType } from 'type-graphql';

@InputType()
export class MintingRequestInput {
  @Field()
  to: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  assetUrl: string;

  @Field({ nullable: true })
  artUrl?: string;
}
