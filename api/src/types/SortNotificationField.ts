import { registerEnumType } from 'type-graphql';

enum SortNotificationField {
  CREATED_AT = 'createdAt',
}

registerEnumType(SortNotificationField, {
  name: 'SortNotificationField',
});

export { SortNotificationField };
