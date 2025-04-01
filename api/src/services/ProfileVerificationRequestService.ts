import mongoose from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { ProfileVerificationRequest, ProfileVerificationRequestModel } from '../models/ProfileVerificationRequest';
import { Context } from '../types/Context';
import { CreateProfileVerificationRequestInput } from '../types/CreateProfileVerificationRequestInput';
import { PageInput } from '../types/PageInput';
import { ProfileVerificationStatusType } from '../types/ProfileVerificationStatusType';
import { ModelService } from './ModelService';

export class ProfileVerificationRequestService extends ModelService<typeof ProfileVerificationRequest> {
  constructor(context: Context) {
    super(context, ProfileVerificationRequestModel);
  }

  async getProfileVerificationRequest(id?: string, profileId?: string): Promise<ProfileVerificationRequest> {
    return id ? await this.model.findOne({ _id: id }) : await this.model.findOne({ profileId });
  }

  getProfileVerificationRequests(
    type: ProfileVerificationStatusType,
    page: PageInput,
  ): Promise<PaginateResult<ProfileVerificationRequest>> {
    return this.context.profileVerificationRequestService.paginate({ filter: { status: type }, page });
  }

  async createProfileVerificationRequest(
    profileId: string,
    input: CreateProfileVerificationRequestInput,
  ): Promise<ProfileVerificationRequest> {
    const { soundcloud, bandcamp, youtube } = input;
    const profileVerificationRequest = new this.model({
      profileId,
      soundcloud,
      bandcamp,
      youtube,
      status: ProfileVerificationStatusType.PENDING,
    });
    await profileVerificationRequest.save();

    this.context.notificationService.newVerificationRequest(profileVerificationRequest.id);

    return profileVerificationRequest;
  }

  async updateProfileVerificationRequest(
    id: string,
    changes: Partial<ProfileVerificationRequest>,
  ): Promise<ProfileVerificationRequest> {
    const profileVerificationRequest = await this.model.findByIdAndUpdate(id, changes, { new: true });

    if (changes.status === ProfileVerificationStatusType.APPROVED) {
      await this.context.profileService.verifyProfile(profileVerificationRequest.profileId.toString(), true);
      await this.context.notificationService.notifyVerificationRequestUpdate(profileVerificationRequest.profileId.toString());
    } else if (changes.status === ProfileVerificationStatusType.DENIED) {
      await this.context.profileService.verifyProfile(profileVerificationRequest.profileId.toString(), false);
      await this.context.notificationService.notifyVerificationRequestUpdate(profileVerificationRequest.profileId.toString());
    }

    if (!profileVerificationRequest) {
      throw new NotFoundError('ProfileVerificationRequest', id);
    }

    return profileVerificationRequest;
  }

  async getPendingRequestsBadgeNumber(): Promise<number> {
    const count = await this.model.find({ status: ProfileVerificationStatusType.PENDING }).countDocuments();

    return count;
  }

  async removeProfileVerificationRequest(id: string): Promise<ProfileVerificationRequest> {
    await this.context.notificationService.deleteNotificationsByVerificationRequestId(id);
    return this.model.findOneAndDelete({ _id: id }).exec();
  }
}
