import { CurrentUser } from 'decorators/current-user';
import { Profile } from 'models/Profile';
import User from 'models/User';
import { ProfileService } from 'services/ProfileService';
import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { UpdateCoverPictureInput } from './types/UpdateCoverPictureInput';
import { UpdateCoverPicturePayload } from './types/UpdateCoverPicturePayload';
import { UpdateFavoriteGenresInput } from './types/UpdateFavoriteGenresInput';
import { UpdateFavoriteGenresPayload } from './types/UpdateFavoriteGenresPayload';
import { UpdateProfilePicturePayload } from './types/UpdateProfilePicturePayload';
import { UpdateSocialMediasInput } from './types/UpdateSocialMediasInput';
import { UpdateSocialMediasPayload } from './types/UpdateSocialMediasPayload';
import { UpdateProfilePictureInput } from './types/UploadProfilePictureInput';

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
    const profile = await ProfileService.updateSocialMedias(profileId, socialMedias);
    return { profile };
  }

  @Mutation(() => UpdateFavoriteGenresPayload)
  @Authorized()
  async updateFavoriteGenres(
    @Arg('input')
    { favoriteGenres }: UpdateFavoriteGenresInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateFavoriteGenresPayload> {
    const profile = await ProfileService.updateFavoriteGenres(profileId, favoriteGenres);
    return { profile };
  }

  @Mutation(() => UpdateProfilePicturePayload)
  @Authorized()
  async updateProfilePicture(
    @Arg('input')
    { picture }: UpdateProfilePictureInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePicturePayload> {
    const profile = await ProfileService.updateProfilePicture(profileId, picture);
    return { profile };
  }

  @Mutation(() => UpdateCoverPicturePayload)
  @Authorized()
  async updateCoverPicture(
    @Arg('input')
    { picture }: UpdateCoverPictureInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateCoverPicturePayload> {
    const profile = await ProfileService.updateCoverPicture(profileId, picture);
    return { profile };
  }
}
