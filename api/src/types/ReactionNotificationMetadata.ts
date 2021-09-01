import { ReactionType } from '../types/ReactionType';

export interface ReactionNotificationMetadata {
  postId: string;
  reactionType: ReactionType;
  authorName: string;
  authorPicture: string | undefined;
}
