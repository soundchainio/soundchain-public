import { gql } from '@apollo/client';

export const EXPLORE_TRACKS = gql`
  query ExploreTracks($search: String, $page: PageInput) {
    exploreTracks(search: $search, page: $page) {
      nodes {
        id
        title
        artworkUrl
        playbackUrl
        artist
        isFavorite
        playbackCount
        favoriteCount
        assetUrl
        editionSize
        listingCount
        listingItem {
          id
          owner
          nft
          tokenId
          contract
          startingTime
          endingTime
          reservePrice
          selectedCurrency
          reservePriceToShow
          pricePerItem
          pricePerItemToShow
        }
        bundleId
        privateAsset
        saleType
        ISRC
        price {
          value
          currency
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
