import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { FollowModel } from '../models/Follow';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { ProfileService } from '../services/ProfileService';
import { FollowProfileInput } from './types/FollowProfileInput';
import { FollowProfilePayload } from './types/FollowProfilePayload';
import { UnfollowProfileInput } from './types/UnfollowProfileInput';
import { UnfollowProfilePayload } from './types/UnfollowProfilePayload';
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
  @FieldResolver(() => String)
  userHandle(@Root() profile: Profile): Promise<string> {
    return ProfileService.getUserHandle(profile._id);
  }

  @FieldResolver(() => Boolean)
  isFollowed(@Root() profile: Profile, @CurrentUser() user?: User): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }

    return FollowModel.exists({ followerId: user.profileId, followedId: profile._id });
  }

  @Query(() => Profile)
  @Authorized()
  myProfile(@CurrentUser() { profileId }: User): Promise<Profile> {
    return ProfileService.getProfile(profileId);
  }

  @Query(() => Profile)
  profile(@Arg('id') id: string): Promise<Profile> {
    return ProfileService.getProfile(id);
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

  @Mutation(() => FollowProfilePayload)
  @Authorized()
  async followProfile(
    @Arg('input') { followedId }: FollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<FollowProfilePayload> {
    const followedProfile = await ProfileService.followProfile(followerId, followedId);
    return { followedProfile };
  }

  @Mutation(() => UnfollowProfilePayload)
  @Authorized()
  async unfollowProfile(
    @Arg('input') { followedId }: UnfollowProfileInput,
    @CurrentUser() { profileId: followerId }: User,
  ): Promise<UnfollowProfilePayload> {
    const unfollowedProfile = await ProfileService.unfollowProfile(followerId, followedId);
    return { unfollowedProfile };
  }
}
