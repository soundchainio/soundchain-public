import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { NewVerificationRequestNotification } from '../types/NewVerificationRequestNotification';
import { NewVerificationRequestNotificationMetadata } from '../types/NewVerificationRequestNotificationMetadata';

@Resolver(NewVerificationRequestNotification)
export class NewVerificationRequestNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  verificationRequestId(@Root() { metadata }: Notification): string {
    const { verificationRequestId } = metadata as NewVerificationRequestNotificationMetadata;
    return verificationRequestId;
  }
}
