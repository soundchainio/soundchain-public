import { PlaylistDocument } from "../../../../lib/graphql";

export const mockPlaylist = {
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

export const mockPlaylistTracks = {
  tracks: [
    {
      __typename: "Track",
      id: "636ed68243ead0084c1d22e0",
      profileId: "636d616a2433871bfdfbea0c",
      title: "Guns 1",
      assetUrl: "https://soundchain-api-develop-uploads.s3.us-east-1.amazonaws.com/71910692-4274-4f90-b426-4aa02d92de12",
      artworkUrl: "https://soundchain-api-develop-uploads.s3.us-east-1.amazonaws.com/bfb7528f-6061-4481-a9bd-426d98daeec1",
      description: "123",
      utilityInfo: "123",
      artist: "randal923",
      ISRC: "",
      artistId: "636d616a2433871bfdfbea0e",
      artistProfileId: "636d616a2433871bfdfbea0c",
      album: "1231",
      releaseYear: 2022,
      copyright: "",
      genres: [],
      playbackUrl: "https://stream.mux.com/xTLWnBAK33RwymXb4eei2kBD2rzHw5I2v1M2PcmeTS00.m3u8",
      createdAt: "2022-11-11T23:10:58.432Z",
      updatedAt: "2022-11-11T23:10:59.400Z",
      deleted: false,
      playbackCountFormatted: "",
      isFavorite: false,
      favoriteCount: 0,
      listingCount: 0,
      playbackCount: 0,
      saleType: "",
      price: {
        __typename: "TrackPrice",
        value: 0,
        currency: "MATIC"
      },
      trackEditionId: "636ed67843ead0084c1d22df",
      editionSize: 1,
      nftData: {
        __typename: "NFTDataType",
        transactionHash: "0x4d475cdcb461a820c1f533f1dffa09a8a8ddd7a66b9db5887138bebe7f3a81ab",
        tokenId: 574,
        contract: "0xEFdd1A20Bd6159Bf023d784c0fbE3b70580F378C",
        minter: "0xb7824c3Bfb6dD456788CDD801Bd961a8dFF7CC09",
        ipfsCid: "QmRigLghSoHPBM39b9VG49wmGmLm2imB9Jrszf3H8mZMDo",
        pendingRequest: "None",
        owner: "0xb7824c3Bfb6dD456788CDD801Bd961a8dFF7CC09",
        pendingTime: "2022-11-11T23:10:57.874Z"
      },
      trackEdition: {
        __typename: "TrackEdition",
        id: "636ed67843ead0084c1d22df",
        editionId: 128,
        transactionHash: "0x3f34424482d769adfbe758944ae8cbef3e5eb9789929bc6daeba3e7c7bc22268",
        contract: "0xEFdd1A20Bd6159Bf023d784c0fbE3b70580F378C",
        listed: false,
        marketplace: null,
        editionSize: 1,
        deleted: false,
        createdAt: "2022-11-11T23:10:48.229Z",
        updatedAt: "2022-11-11T23:10:59.397Z",
        editionData: {
          __typename: "EditionDataType",
          pendingRequest: "None",
          pendingTime: null,
          pendingTrackCount: null,
          transactionHash: "0x3f34424482d769adfbe758944ae8cbef3e5eb9789929bc6daeba3e7c7bc22268",
          contract: "0xEFdd1A20Bd6159Bf023d784c0fbE3b70580F378C",
          owner: "0xb7824c3Bfb6dD456788CDD801Bd961a8dFF7CC09"
        }
      }
    }
  ]
}