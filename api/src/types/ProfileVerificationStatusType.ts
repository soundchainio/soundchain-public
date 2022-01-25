import { registerEnumType } from 'type-graphql';

enum ProfileVerificationStatusType {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

registerEnumType(ProfileVerificationStatusType, {
  name: 'ProfileVerificationStatusType',
});

export { ProfileVerificationStatusType };
