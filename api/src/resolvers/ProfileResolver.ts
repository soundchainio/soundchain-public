import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import Profile from '../models/Profile';
import User from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { UpdateProfileInput } from './types/UpadeteProfileInput';
import { UpdateProfilePayload } from './types/UpdateProfilePayload';

@Resolver(Profile)
export class ProfileResolver {
  @Query(() => Profile, { nullable: true })
  @Authorized()
  async myProfile(@CurrentUser() user: User): Promise<Profile | undefined> {
    return await ProfileService.getProfile(user.profileId);
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateProfile(
    @Arg('input')
    { socialMediaLinks }: UpdateProfileInput,
    @CurrentUser() user: User,
  ): Promise<UpdateProfilePayload> {
    try {
      const profile = await ProfileService.updateProfile(user.profileId, socialMediaLinks);
      return { profile };
    } catch (err) {
      throw new Error(`Error while updating profile: ${err.message}`);
    }
  }
}
