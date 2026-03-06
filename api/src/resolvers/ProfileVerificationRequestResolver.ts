import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { ProfileVerificationRequest } from '../models/ProfileVerificationRequest';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateProfileVerificationRequestInput } from '../types/CreateProfileVerificationRequestInput';
import { PageInput } from '../types/PageInput';
import { ProfileVerificationRequestConnection } from '../types/ProfileVerificationRequestConnection';
import { ProfileVerificationRequestPayload } from '../types/ProfileVerificationRequestPayload';
import { ProfileVerificationStatusType } from '../types/ProfileVerificationStatusType';
import { Role } from '../types/Role';

@Resolver(ProfileVerificationRequest)
export class ProfileVerificationRequestResolver {
  @Query(() => ProfileVerificationRequest)
  @Authorized()
  profileVerificationRequest(
    @Ctx() { profileVerificationRequestService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('profileId', { nullable: true }) argProfileId: string,
    @Arg('id', { nullable: true }) id: string,
  ): Promise<ProfileVerificationRequest> {
    return profileVerificationRequestService.getProfileVerificationRequest(id, argProfileId || profileId.toString());
  }

  @Query(() => ProfileVerificationRequestConnection)
  @Authorized(Role.ADMIN)
  profileVerificationRequests(
    @Ctx() { profileVerificationRequestService }: Context,
    @Arg('status', () => ProfileVerificationStatusType, { nullable: true }) status: ProfileVerificationStatusType,
    @Arg('page', { nullable: true }) page: PageInput,
  ): Promise<ProfileVerificationRequestConnection> {
    return profileVerificationRequestService.getProfileVerificationRequests(status, page);
  }

  @Query(() => Number)
  @Authorized()
  pendingRequestsBadgeNumber(@Ctx() { profileVerificationRequestService }: Context): Promise<number> {
    return profileVerificationRequestService.getPendingRequestsBadgeNumber();
  }

  @Mutation(() => ProfileVerificationRequestPayload)
  @Authorized()
  async createProfileVerificationRequest(
    @Ctx() { profileVerificationRequestService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateProfileVerificationRequestInput,
  ): Promise<ProfileVerificationRequestPayload> {
    const profileVerificationRequest = await profileVerificationRequestService.createProfileVerificationRequest(
      profileId.toString(),
      { ...input },
    );
    return { profileVerificationRequest };
  }

  @Mutation(() => ProfileVerificationRequestPayload)
  @Authorized(Role.ADMIN)
  async updateProfileVerificationRequest(
    @Ctx() { profileVerificationRequestService }: Context,
    @Arg('id') id: string,
    @Arg('input') input: CreateProfileVerificationRequestInput,
  ): Promise<ProfileVerificationRequestPayload> {
    const updatedInput = {
      ...input,
      reviewerProfileId: input.reviewerProfileId ? new mongoose.Types.ObjectId(input.reviewerProfileId) : undefined,
    };
    const profileVerificationRequest = await profileVerificationRequestService.updateProfileVerificationRequest(id, updatedInput);
    return { profileVerificationRequest };
  }

  @Mutation(() => ProfileVerificationRequestPayload)
  @Authorized()
  async removeProfileVerificationRequest(
    @Ctx() { profileVerificationRequestService }: Context,
    @Arg('id') id: string,
  ): Promise<ProfileVerificationRequestPayload> {
    const profileVerificationRequest = await profileVerificationRequestService.removeProfileVerificationRequest(id);
    return { profileVerificationRequest };
  }
}
