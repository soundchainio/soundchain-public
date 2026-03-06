export const MusicalNote = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
      {/* Main note body - cyan/purple gradient */}
      <defs>
        <linearGradient id="noteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="noteShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Double musical note */}
      <path
        fill="url(#noteGradient)"
        d="M417.7,64.3c-4.6-3.1-10.5-3.4-15.4-0.8L178.3,189.8c-5.4,2.9-8.8,8.5-8.8,14.6v180.8
        c-14.4-9.6-33.9-14-55.5-10.3c-41.4,7-69.5,41.3-62.8,76.7c6.7,35.4,47.8,56.8,89.2,49.8c36.2-6.1,62.1-32.6,63.8-61.5
        c0-0.3,0.1-0.6,0.1-0.9V254.1l192-108.9v155.6c-14.4-9.6-33.9-14-55.5-10.3c-41.4,7-69.5,41.3-62.8,76.7
        c6.7,35.4,47.8,56.8,89.2,49.8c36.2-6.1,62.1-32.6,63.8-61.5c0-0.3,0.1-0.6,0.1-0.9V80C431.1,73.5,422.3,67.4,417.7,64.3z"
      />

      {/* Shine overlay */}
      <path
        fill="url(#noteShine)"
        d="M417.7,64.3c-4.6-3.1-10.5-3.4-15.4-0.8L178.3,189.8c-5.4,2.9-8.8,8.5-8.8,14.6v50
        l224-126.5v-48C393.5,72.3,404.5,60.5,417.7,64.3z"
      />

      {/* Left note head highlight */}
      <ellipse
        fill="#FFFFFF"
        opacity="0.3"
        cx="115"
        cy="420"
        rx="35"
        ry="20"
        transform="rotate(-15 115 420)"
      />

      {/* Right note head highlight */}
      <ellipse
        fill="#FFFFFF"
        opacity="0.3"
        cx="340"
        cy="320"
        rx="35"
        ry="20"
        transform="rotate(-15 340 320)"
      />

      {/* Sparkles */}
      <circle fill="#FFFFFF" cx="450" cy="100" r="8" opacity="0.8" />
      <circle fill="#FFFFFF" cx="470" cy="130" r="5" opacity="0.6" />
      <circle fill="#FFFFFF" cx="440" cy="150" r="4" opacity="0.5" />
    </svg>
  )
}
