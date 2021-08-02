import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import Profile from '../models/Profile';
import User from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { UpdateProfileInput } from './types/UpadeteProfileInput';
import { UpdateProfilePayload } from './types/UpdateProfilePayload';

@Resolver(Profile)
export class ProfileResolver {
  @Query(() => Profile)
  @Authorized()
  async myProfile(@CurrentUser() { profileId }: User): Promise<Profile> {
    return await ProfileService.getProfile(profileId);
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateProfile(
    @Arg('input')
    { socialMediaHandles }: UpdateProfileInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    try {
      const profile = await ProfileService.updateProfile(profileId, socialMediaHandles);
      return { profile };
    } catch (err) {
      throw new Error(`Error while updating profile: ${err.message}`);
    }
  }
}
