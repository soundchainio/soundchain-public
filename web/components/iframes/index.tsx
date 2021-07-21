import React from "react";

export function YoutubeIframe({videoUrl}: any){
    return <iframe
        width="853"
        height="480"
        src={`https://www.youtube.com/embed/${videoUrl.split('https://www.youtube.com/watch?v=')[1].split("&")[0]}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded youtube"
    />
}