import '@testing-library/jest-dom'
import { GetServerSidePropsContext } from 'next/types'
import PlaylistPage, { getServerSideProps } from './[playlistId]'
import { ParsedUrlQuery } from 'querystring'
import { mockPlaylist, mockPlaylistTracks, mockProfile } from 'components/pages/Playlist/mocks/playlist.mock'
import { getPlaylistData, getPlaylistTracksData, getProfileData } from 'repositories/playlist'
import { mocked } from 'jest-mock'
import { render, screen } from '@testing-library/react'

jest.mock('repositories/playlist')
const mockedGetPlaylistData = mocked(getPlaylistData)
const mockedGetPlaylistTracksData = mocked(getPlaylistTracksData)
const mockedGetProfileData = mocked(getProfileData)

interface NextLink {
  children: any
  href: string
}

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: NextLink) => <children.type {...children.props} href={href} />,
}))

describe('Playlist', () => {
  it('should return NOT FOUND if not playlist id is found in the url params', async () => {
    const context = {
      params: {} as ParsedUrlQuery,
    }
    const value = await getServerSideProps(context as GetServerSidePropsContext)
    expect(value).toEqual({ notFound: true })
  })

  it('should run getServerSideProps correctly', async () => {
    mockedGetPlaylistData.mockResolvedValue(mockPlaylist)
    mockedGetPlaylistTracksData.mockResolvedValue(mockPlaylistTracks)
    mockedGetProfileData.mockResolvedValue(mockProfile)

    const context = {
      params: { playlistId: 'any_id' } as ParsedUrlQuery,
      resolvedUrl: 'any_url',
      req: {
        url: 'any_url',
      },
    }

    const value = await getServerSideProps(context as GetServerSidePropsContext)

    const response = {
      props: {
        playlistData: mockPlaylist,
        playlistTracksData: mockPlaylistTracks,
        profileData: mockProfile,
        cache: {},
      },
    }

    expect(value).toStrictEqual(response)
  })
})
