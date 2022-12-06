/* eslint-disable @typescript-eslint/no-explicit-any */
import { apolloClient } from 'lib/apollo'
import { ExploreTracksWithProfilesDocument, Profile, Track } from 'lib/graphql'
import { errorHandler } from 'utils/errorHandler'

type TracksWithProfile = Track & { profile: Profile }

export const getExploreTracksWithProfiles = async (searchterm: string) => {
  try {
    const result = await apolloClient.query({
      query: ExploreTracksWithProfilesDocument,
      variables: {
        sort: {
          field: 'CREATED_AT',
        },
        search: searchterm,
        page: {
          first: 15,
        },
      },
    })

    const tracksWithProfiles: TracksWithProfile[] = result.data.exploreTracksWithProfiles.tracks.map(
      (track: any, index: number) => {
        return {
          ...track,
          profile: {
            ...result.data.exploreTracksWithProfiles.profiles[index],
          },
        }
      },
    )

    return tracksWithProfiles
  } catch (error) {
    errorHandler(error)
  }
}
