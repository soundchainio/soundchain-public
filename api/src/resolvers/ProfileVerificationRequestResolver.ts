import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { ProfileVerificationRequest } from '../models/ProfileVerificationRequest';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateProfileVerificationRequestInput } from '../types/CreateProfileVerificationRequestInput';
import { ProfileVerificationRequestPayload } from '../types/ProfileVerificationRequestPayload';

@Resolver(ProfileVerificationRequest)
export class ProfileVerificationRequestResolver {
  @Query(() => ProfileVerificationRequest)
  @Authorized()
  profileVerificationRequest(
    @Ctx() { profileVerificationRequestService }: Context,
    @CurrentUser() { profileId }: User,
  ): Promise<ProfileVerificationRequest> {
    return profileVerificationRequestService.getProfileVerificationRequest(profileId);
  }

  @Mutation(() => ProfileVerificationRequestPayload)
  @Authorized()
  async createProfileVerificationRequest(
    @Ctx() { profileVerificationRequestService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateProfileVerificationRequestInput,
  ): Promise<ProfileVerificationRequestPayload> {
    const profileVerificationRequest = await profileVerificationRequestService.createProfileVerificationRequest(profileId, { ...input });
    return { profileVerificationRequest };
  }
}
