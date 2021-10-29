import { registerEnumType } from 'type-graphql';

enum PendingRequest {
  Mint = 'Mint',
  List = 'List',
  Buy = 'Buy',
  CancelListing = 'CancelListing',
  None = 'None',
}

registerEnumType(PendingRequest, {
  name: 'PendingRequest',
});

export { PendingRequest };
