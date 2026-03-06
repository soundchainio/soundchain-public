import { ProfileView, ProfileViewModel } from '../models/ProfileView';
import { ProfileModel } from '../models/Profile';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

export class ProfileViewService extends ModelService<typeof ProfileView> {
  constructor(context: Context) {
    super(context, ProfileViewModel);
  }

  /**
   * Log a profile view with 5-minute dedup per viewer-viewed pair
   */
  async logView(viewerProfileId: string, viewedProfileId: string): Promise<void> {
    // Don't log self-views
    if (viewerProfileId === viewedProfileId) return;

    // 5-minute dedup
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await ProfileViewModel.findOne({
      viewerProfileId,
      viewedProfileId,
      createdAt: { $gte: fiveMinAgo },
    }).lean();

    if (recent) return;

    const view = new ProfileViewModel({ viewerProfileId, viewedProfileId });
    await view.save();

    // Atomic increment on profile
    await ProfileModel.updateOne(
      { _id: viewedProfileId },
      { $inc: { profileViewCount: 1 } },
    );
  }

  /**
   * Get view count for today (since midnight UTC)
   */
  async getViewCountToday(profileId: string): Promise<number> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return ProfileViewModel.countDocuments({
      viewedProfileId: profileId,
      createdAt: { $gte: today },
    });
  }

  /**
   * Get recent viewer profile IDs
   */
  async getRecentViewers(profileId: string, limit: number = 10): Promise<string[]> {
    const views = await ProfileViewModel.find({ viewedProfileId: profileId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return views.map((v) => v.viewerProfileId);
  }
}
