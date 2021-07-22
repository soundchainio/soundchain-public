import React from "react";

type YoutubeFrameProps = {
  videoUrl: string;
  width: string;
  height: string;
};
export function YoutubeIframe({ videoUrl, width, height }: YoutubeFrameProps) {
  return (
    <iframe
      width={width}
      height={height}
      src={`https://www.youtube.com/embed/${videoUrl.split('https://www.youtube.com/watch?v=')[1].split('&')[0]}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Embedded youtube"
    />
  );
}