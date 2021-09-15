import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { NewPostNotification } from '../types/NewPostNotification';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';

@Resolver(NewPostNotification)
export class NewPostNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  authorName(@Root() { metadata }: Notification): string {
    const { authorName } = metadata as NewPostNotificationMetadata;
    return authorName;
  }

  @FieldResolver(() => String, { nullable: true })
  authorPicture(@Root() { metadata }: Notification): string | undefined {
    const { authorPicture } = metadata as NewPostNotificationMetadata;
    return authorPicture;
  }

  @FieldResolver(() => String)
  body(): string {
    return 'created a new post:';
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    const { postBody } = metadata as NewPostNotificationMetadata;
    return postBody;
  }

  @FieldResolver(() => String, { nullable: true })
  previewLink(@Root() { metadata }: Notification): string | undefined {
    const { postLink } = metadata as NewPostNotificationMetadata;
    return postLink;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId } = metadata as NewPostNotificationMetadata;
    return `/posts/${postId}`;
  }
}
