import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { FollowProfileInput } from '../types/FollowProfileInput';
import { FollowProfilePayload } from '../types/FollowProfilePayload';
import { UnfollowProfileInput } from '../types/UnfollowProfileInput';
import { UnfollowProfilePayload } from '../types/UnfollowProfilePayload';
import { UpdateCoverPictureInput } from '../types/UpdateCoverPictureInput';
import { UpdateCoverPicturePayload } from '../types/UpdateCoverPicturePayload';
import { UpdateFavoriteGenresInput } from '../types/UpdateFavoriteGenresInput';
import { UpdateFavoriteGenresPayload } from '../types/UpdateFavoriteGenresPayload';
import { UpdateProfileBioInput } from '../types/UpdateProfileBioInput';
import { UpdateProfileBioPayload } from '../types/UpdateProfileBioPayload';
import { UpdateMusicianTypeInput } from '../types/UpdateMusicianTypeInput';
import { UpdateMusicianTypePayload } from '../types/UpdateMusicianTypePayload';
import { UpdateProfileDisplayNameInput } from '../types/UpdateProfileDisplayNameInput';
import { UpdateProfileDisplayNamePayload } from '../types/UpdateProfileDisplayNamePayload';
import { UpdateProfilePicturePayload } from '../types/UpdateProfilePicturePayload';
import { UpdateSocialMediasInput } from '../types/UpdateSocialMediasInput';
import { UpdateSocialMediasPayload } from '../types/UpdateSocialMediasPayload';
import { UpdateProfilePictureInput } from '../types/UploadProfilePictureInput';

@Resolver(Profile)
export class ProfileResolver {
  @FieldResolver(() => String)
  userHandle(@Ctx() { profileService }: Context, @Root() profile: Profile): Promise<string> {
    return profileService.getUserHandle(profile._id);
  }

  @FieldResolver(() => Boolean)
  isFollowed(
    @Ctx() { followService }: Context,
    @Root() profile: Profile,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }

    return followService.exists({ followerId: user.profileId, followedId: profile._id });
  }

  @Query(() => Profile)
  @Authorized()
  myProfile(@Ctx() { profileService }: Context, @CurrentUser() { profileId }: User): Promise<Profile> {
    return profileService.getProfile(profileId);
  }

  @Query(() => Profile)
  profile(@Ctx() { profileService }: Context, @Arg('id') id: string): Promise<Profile> {
    return profileService.getProfile(id);
  }

  @Mutation(() => UpdateSocialMediasPayload)
  @Authorized()
  async updateSocialMedias(
    @Ctx() { profileService }: Context,
    @Arg('input') socialMedias: UpdateSocialMediasInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateSocialMediasPayload> {
    const profile = await profileService.updateSocialMedias(profileId, socialMedias);
    return { profile };
  }

  @Mutation(() => UpdateFavoriteGenresPayload)
  @Authorized()
  async updateFavoriteGenres(
    @Ctx() { profileService }: Context,
    @Arg('input') { favoriteGenres }: UpdateFavoriteGenresInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateFavoriteGenresPayload> {
    const profile = await profileService.updateFavoriteGenres(profileId, favoriteGenres);
    return { profile };
  }

  @Mutation(() => UpdateFavoriteGenresPayload)
  @Authorized()
  async updateMusicianType(
    @Ctx() { profileService }: Context,
    @Arg('input') { musicianTypes }: UpdateMusicianTypeInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateMusicianTypePayload> {
    const profile = await profileService.updateMusicianType(profileId, musicianTypes);
    return { profile };
  }

  @Mutation(() => UpdateProfilePicturePayload)
  @Authorized()
  async updateProfilePicture(
    @Ctx() { profileService }: Context,
    @Arg('input') { picture }: UpdateProfilePictureInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePicturePayload> {
    const profile = await profileService.updateProfilePicture(profileId, picture);
    return { profile };
  }

  @Mutation(() => UpdateProfileDisplayNamePayload)
  @Authorized()
  async updateProfileDisplayName(
    @Ctx() { profileService }: Context,
    @Arg('input') { displayName }: UpdateProfileDisplayNameInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfileDisplayNamePayload> {
    const profile = await profileService.updateDisplayName(profileId, displayName);
    return { profile };
  }

  @Mutation(() => UpdateProfileDisplayNamePayload)
  @Authorized()
  async updateProfileBio(
    @Ctx() { profileService }: Context,
    @Arg('input') { bio }: UpdateProfileBioInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfileBioPayload> {
    const profile = await profileService.updateBio(profileId, bio);
    return { profile };
  }

  @Mutation(() => UpdateCoverPicturePayload)
  @Authorized()
  async updateCoverPicture(
    @Ctx() { profileService }: Context,
    @Arg('input') { picture }: UpdateCoverPictureInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateCoverPicturePayload> {
    const profile = await profileService.updateCoverPicture(profileId, picture);
    return { profile };
  }

  @Mutation(() => FollowProfilePayload)
  @Authorized()
  async followProfile(
    @Ctx() { profileService }: Context,
    @Arg('input') { followedId }: FollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<FollowProfilePayload> {
    const followedProfile = await profileService.followProfile(followerId, followedId);
    return { followedProfile };
  }

  @Mutation(() => UnfollowProfilePayload)
  @Authorized()
  async unfollowProfile(
    @Ctx() { profileService }: Context,
    @Arg('input') { followedId }: UnfollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<UnfollowProfilePayload> {
    const unfollowedProfile = await profileService.unfollowProfile(followerId, followedId);
    return { unfollowedProfile };
  }
}
