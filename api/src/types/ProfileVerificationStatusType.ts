import { registerEnumType } from 'type-graphql';

enum ProfileVerificationStatusType {
  WAITING = 'waiting',
  ACCEPTED = 'accepted',
  DENIED = 'denied',
}

registerEnumType(ProfileVerificationStatusType, {
  name: 'ProfileVerificationStatusType',
});

export { ProfileVerificationStatusType };
