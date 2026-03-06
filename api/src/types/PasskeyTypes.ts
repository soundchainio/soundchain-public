import { Field, InputType, ObjectType } from 'type-graphql';

@ObjectType()
export class PasskeyOptionsPayload {
  @Field()
  sessionId: string;

  @Field()
  options: string; // JSON-serialized WebAuthn options

  @Field({ nullable: true })
  hasEmailKey?: boolean; // Whether user has a registered EmailKey
}

@ObjectType()
export class PasskeyVerifyPayload {
  @Field()
  success: boolean;
}

@InputType()
export class PasskeyRegisterVerifyInput {
  @Field()
  sessionId: string;

  @Field()
  credential: string; // JSON-serialized registration response

  @Field({ nullable: true })
  friendlyName?: string;
}

@InputType()
export class PasskeyLoginVerifyInput {
  @Field()
  sessionId: string;

  @Field()
  credential: string; // JSON-serialized authentication response
}
