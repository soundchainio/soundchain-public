import { CurrentUser } from 'decorators/current-user';
import { Profile } from 'models/Profile';
import User from 'models/User';
import { ProfileService } from 'services/ProfileService';
import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { UpdateFavoriteGenresInput } from './types/UpdateFavoriteGenresInput';
import { UpdateFavoriteGenresPayload } from './types/UpdateFavoriteGenresPayload';
import { UpdateSocialMediasInput } from './types/UpdateSocialMediasInput';
import { UpdateSocialMediasPayload } from './types/UpdateSocialMediasPayload';

@Resolver(Profile)
export class ProfileResolver {
  @FieldResolver(() => String)
  userHandle(@Root() profile: Profile): Promise<string> {
    return ProfileService.getUserHandle(profile._id);
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
}
