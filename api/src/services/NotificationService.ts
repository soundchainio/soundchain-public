import { NotificationType } from 'enums/NotificationType';
import { NotificationModel } from 'models/Notification';
import { CommentService } from './CommentService';
import { PostService } from './PostService';

interface CommentNotificationParams {
  commentId: string;
  postId: string;
}

export class NotificationService {
  static async notifyNewCommentOnPost({ commentId, postId }: CommentNotificationParams): Promise<void> {
    const { profileId: senderProfileId } = await CommentService.getComment(commentId);
    const { profileId: receiverProfileId } = await PostService.getPost(postId);
    if (senderProfileId !== receiverProfileId) {
      const notification = new NotificationModel({
        type: NotificationType.Comment,
        senderProfileId,
        receiverProfileId,
        contentId: commentId,
      });
      notification.save();
    }
  }
}
