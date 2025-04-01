import { Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { Track } from '../models/Track';
import { DeletedPostNotification } from '../types/DeletedPostNotification';
import { DeletedPostNotificationMetadata } from '../types/DeletedPostNotificationMetadata';
import { Context } from '../types/Context';

@Resolver(DeletedPostNotification)
export class DeletedPostNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
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
    return 'Your post was deleted by an admin:';
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    const { postBody } = metadata as DeletedPostNotificationMetadata;
    return postBody;
  }

  @FieldResolver(() => String, { nullable: true })
  mediaLink(@Root() { metadata }: Notification): string | undefined {
    const { postLink } = metadata as DeletedPostNotificationMetadata;
    return postLink;
  }

  @FieldResolver(() => Track, { nullable: true })
  async track(
    @Root() { metadata }: Notification,
    @Ctx() { trackService }: Context,
  ): Promise<Track | null> {
    const { trackId } = metadata as DeletedPostNotificationMetadata;
    if (!trackId) return null;
    return trackService.getTrack(trackId.toString());
  }
}
