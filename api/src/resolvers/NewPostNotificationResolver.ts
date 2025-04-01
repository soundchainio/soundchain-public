import { Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { Track } from '../models/Track';
import { Context } from '../types/Context';
import { NewPostNotification } from '../types/NewPostNotification';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';

@Resolver(NewPostNotification)
export class NewPostNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
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
    return postBody || '';
  }

  @FieldResolver(() => String, { nullable: true })
  previewLink(@Root() { metadata }: Notification): string | undefined {
    const { postLink } = metadata as NewPostNotificationMetadata;
    return postLink;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId } = metadata as NewPostNotificationMetadata;
    return `/posts/${postId.toString()}`;
  }

  @FieldResolver(() => Track, { nullable: true })
  track(@Ctx() { trackService }: Context, @Root() { metadata }: Notification): Promise<Track | null> {
    const { trackId } = metadata as NewPostNotificationMetadata;
    if (!trackId) return null;
    return trackService.getTrack(trackId.toString());
  }
}
