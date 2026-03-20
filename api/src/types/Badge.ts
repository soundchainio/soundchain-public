import { registerEnumType } from 'type-graphql';

enum Badge {
  SUPPORTER_FIRST_EVENT_AE_SC = 'SUPPORTER_FIRST_EVENT_AE_SC',
  agent = 'agent',
  early_adopter = 'early_adopter',
}

registerEnumType(Badge, {
  name: 'Badge',
});

export { Badge };
