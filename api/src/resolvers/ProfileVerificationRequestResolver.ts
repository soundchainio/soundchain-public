import { Arg, Authorized, Ctx, Mutation, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { ProfileVerificationRequest } from '../models/ProfileVerificationRequest';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { CreateProfileVerificationRequestInput } from '../types/CreateProfileVerificationRequestInput';
import { ProfileVerificationRequestPayload } from '../types/ProfileVerificationRequestPayload';

@Resolver(ProfileVerificationRequest)
export class ProfileVerificationRequestResolver {
  @Mutation(() => ProfileVerificationRequestPayload)
  @Authorized()
  async createProfileVerificationRequest(
    @Ctx() { ProfileVerificationRequestService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateProfileVerificationRequestInput,
  ): Promise<ProfileVerificationRequestPayload> {
    const profileVerificationRequest = await ProfileVerificationRequestService.createProfileVerificationRequest(profileId, { ...input });
    return { profileVerificationRequest };
  }
}
