import { registerEnumType } from 'type-graphql';

enum SaleType {
  AUCTION = 'auction',
  BUY_NOW = 'buy_now',
}

registerEnumType(SaleType, {
  name: 'SaleType',
});

export { SaleType };
