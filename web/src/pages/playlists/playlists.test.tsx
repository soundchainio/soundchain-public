import PlaylistPage from "./[id]";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { GetServerSidePropsContext } from "next/types";
import { getServerSideProps } from "./[id]";
import { ParsedUrlQuery } from 'querystring';
import { mockPlaylist } from "components/pages/Playlist/mocks/playlist.mock";

const mockGetServerSideProps = jest.fn(() => Promise.resolve({ props: mockPlaylist }));

describe("Playlist", () => {
  
  it("should render playlist page correctly", () => {
    render(<PlaylistPage playlist={mockPlaylist}/>)

    expect(screen.getByTestId("playlist-container")).toBeInTheDocument();
  });
  
  it('should return NOT FOUND if not playlist id is found in the url params', async () => {
    render(<PlaylistPage playlist={mockPlaylist} />)

    const context = {
      params: {  } as ParsedUrlQuery
    };
    
    const value = await getServerSideProps(context as GetServerSidePropsContext);

    expect(value).toEqual({ notFound: true });
  })

  it('should return playlist data correctly', async () => {
    const data = await mockGetServerSideProps();

    expect(data).toEqual({ props: mockPlaylist })
  })
});