import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import { Profile } from '../models/Profile';
import User from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { UpdateSocialMediasInput } from './types/UpdateSocialMediasInput';
import { UpdateSocialMediasPayload } from './types/UpdateSocialMediasPayload';

@Resolver(Profile)
export class ProfileResolver {
  @Query(() => Profile)
  @Authorized()
  myProfile(@CurrentUser() { profileId }: User): Promise<Profile> {
    return ProfileService.getProfile(profileId);
  }

  @Mutation(() => UpdateSocialMediasPayload)
  @Authorized()
  async updateSocialMedias(
    @Arg('input')
    socialMedias: UpdateSocialMediasInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateSocialMediasPayload> {
    try {
      const profile = await ProfileService.updateSocialMedias(profileId, socialMedias);
      return { profile };
    } catch (err) {
      throw new Error(`Error while updating profile: ${err.message}`);
    }
  }
}
