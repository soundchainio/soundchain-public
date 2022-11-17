import { PlaylistDocument } from "../../../../lib/graphql";

export const mockPlaylist = {
    request: {
        query: PlaylistDocument,
      },
      result: {
        data: { 
            id: "any_id",
            title: "any_title",
            description: "any_description",
            artworkUrl: "any_artworkUrl",
            profileId: "any_profileId",
            createdAt: "any_createdAt",
            deleted: "any_deleted",
            favoriteCount: "any_favoriteCount",
            followCount: "any_followCount",
            isFavorite: "any_isFavorite",
            isFollowed: "any_isFollowed",
         }
      }
}