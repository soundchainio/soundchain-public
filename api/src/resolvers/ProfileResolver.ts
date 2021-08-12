import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import { Profile } from '../models/Profile';
import User from '../models/User';
import { AWSService } from '../services/AWSService';
import { ProfileService } from '../services/ProfileService';
import { GenerateUploadUrlInput } from './types/GenerateUploadUrlInput';
import { GenerateUploadUrlPayload } from './types/GenerateUploadUrlPayload';
import { UpdateFavoriteGenresInput } from './types/UpdateFavoriteGenresInput';
import { UpdatePictureInput } from './types/UpdatePictureInput';
import { UpdateProfilePayload } from './types/UpdateProfilePayload';
import { UpdateSocialMediasInput } from './types/UpdateSocialMediasInput';

@Resolver(Profile)
export class ProfileResolver {
  @Query(() => Profile)
  @Authorized()
  myProfile(@CurrentUser() { profileId }: User): Promise<Profile> {
    return ProfileService.getProfile(profileId);
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateSocialMedias(
    @Arg('input')
    socialMedias: UpdateSocialMediasInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    const profile = await ProfileService.updateSocialMedias(profileId, socialMedias);
    return { profile };
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateFavoriteGenres(
    @Arg('input')
    { favoriteGenres }: UpdateFavoriteGenresInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    const profile = await ProfileService.updateFavoriteGenres(profileId, favoriteGenres);
    return { profile };
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateProfilePicture(
    @Arg('input')
    { picture }: UpdatePictureInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    const profile = await ProfileService.updateProfilePicture(profileId, picture);
    return { profile };
  }

  @Mutation(() => UpdateProfilePayload)
  @Authorized()
  async updateCoverPicture(
    @Arg('input')
    { picture }: UpdatePictureInput,
    @CurrentUser() { profileId }: User,
  ): Promise<UpdateProfilePayload> {
    const profile = await ProfileService.updateCoverPicture(profileId, picture);
    return { profile };
  }

  @Mutation(() => GenerateUploadUrlPayload)
  async generateUploadUrl(
    @Arg('input')
    { fileType }: GenerateUploadUrlInput,
  ): Promise<GenerateUploadUrlPayload> {
    return AWSService.generateUploadUrl(fileType);
  }
}
