import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../middlewares/decorators/current-user';
import { Profile } from '../models/Profile';
import User from '../models/User';
import { AWSService } from '../services/AWSService';
import { ProfileService } from '../services/ProfileService';
import { GenerateUploadUrlInput } from './types/GenerateUploadUrlInput';
import { GenerateUploadUrlPayload } from './types/GenerateUploadUrlPayload';
import { UpdateFavoriteGenresInput } from './types/UpdateFavoriteGenresInput';
import { UpdateFavoriteGenresPayload } from './types/UpdateFavoriteGenresPayload';
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

  @Mutation(() => GenerateUploadUrlPayload)
  async generateUploadUrl(
    @Arg('input')
    { extension }: GenerateUploadUrlInput,
  ): Promise<GenerateUploadUrlPayload> {
    return AWSService.generateUploadUrl(extension);
  }
}
