import React from "react";

type YoutubeFrameProps = {
  embedUrl: string;
  width: string;
  height: string;
};
export function YoutubeIframe({ embedUrl, width, height }: YoutubeFrameProps) {
  return (
    <iframe
      width={width}
      height={height}
      src={`https://www.youtube.com/embed/${embedUrl.split('https://www.youtube.com/watch?v=')[1].split('&')[0]}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Embedded youtube"
    />
  );
}