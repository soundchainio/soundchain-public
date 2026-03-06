import React, { useState, useEffect } from 'react'

const backgroundImages = [
  "https://images.unsplash.com/photo-1643192820595-3ab5cbb56b99?w=1080&fit=crop", // Brazil street art
  "https://images.unsplash.com/photo-1669578948973-0ec8b7cde931?w=1080&fit=crop", // Rio colorful
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=800&fit=crop" // Music/sound waves
]

export function ScrollingBackground() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="fixed inset-0 z-0">
      {backgroundImages.map((image, index) => {
        const parallaxSpeed = 0.3 + index * 0.15
        const translateY = scrollY * parallaxSpeed
        const opacity = Math.max(0, 1 - scrollY / (800 + index * 150))

        return (
          <div
            key={index}
            className="absolute inset-0 transition-all duration-500 ease-out"
            style={{
              transform: `translateY(${translateY}px) scale(${1 + scrollY * 0.0001})`,
              opacity: opacity * (0.6 - index * 0.1),
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: `blur(${scrollY * 0.01}px) brightness(0.7)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 via-transparent to-purple-900/20" />
          </div>
        )
      })}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/80" />

      {/* Neural network overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #00f5ff 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #7c4dff 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
            animation: "pulse 4s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  )
}
