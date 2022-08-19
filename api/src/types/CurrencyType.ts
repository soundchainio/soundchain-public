import { registerEnumType } from 'type-graphql';

enum CurrencyType {
  OGUN = 'OGUN',
  MATIC = 'MATIC'
}

registerEnumType(CurrencyType, {
  name: 'CurrencyType',
});

export { CurrencyType };