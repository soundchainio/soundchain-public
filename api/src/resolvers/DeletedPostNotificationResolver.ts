import { Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { Track } from '../models/Track';
import { Context } from '../types/Context';
import { DeletedPostNotification } from '../types/DeletedPostNotification';
import { DeletedPostNotificationMetadata } from '../types/DeletedPostNotificationMetadata';

@Resolver(DeletedPostNotification)
export class DeletedPostNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  authorName(@Root() { metadata }: Notification): string {
    const { authorName } = metadata as DeletedPostNotificationMetadata;
    return authorName;
  }

  @FieldResolver(() => String, { nullable: true })
  authorPicture(@Root() { metadata }: Notification): string | undefined {
    const { authorPicture } = metadata as DeletedPostNotificationMetadata;
    return authorPicture;
  }

  @FieldResolver(() => String)
  body(): string {
    return 'created a new post:';
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    const { postBody } = metadata as DeletedPostNotificationMetadata;
    return postBody || '';
  }

  @FieldResolver(() => String, { nullable: true })
  previewLink(@Root() { metadata }: Notification): string | undefined {
    const { postLink } = metadata as DeletedPostNotificationMetadata;
    return postLink;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId } = metadata as DeletedPostNotificationMetadata;
    return `/posts/${postId}`;
  }

  @FieldResolver(() => Track, { nullable: true })
  track(@Ctx() { trackService }: Context, @Root() { metadata }: Notification): Promise<Track | null> {
    const { trackId } = metadata as DeletedPostNotificationMetadata;
    if (!trackId) return null;
    return trackService.getTrack(trackId);
  }
}
