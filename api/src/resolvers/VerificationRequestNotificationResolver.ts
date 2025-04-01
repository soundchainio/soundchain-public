import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { VerificationRequestNotification } from '../types/VerificationRequestNotification';
import { VerificationRequestNotificationMetadata } from '../types/VerificationRequestNotificationMetadata';

@Resolver(VerificationRequestNotification)
export class VerificationRequestNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  body(@Root() { metadata }: Notification): string {
    const { body } = metadata as VerificationRequestNotificationMetadata;
    return body;
  }
}
