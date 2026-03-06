export const Vinyl = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
      <defs>
        <linearGradient id="vinylRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.4" />
          <stop offset="25%" stopColor="#8B5CF6" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.4" />
          <stop offset="75%" stopColor="#10B981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="vinylShine" cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="labelGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Outer disc */}
      <circle cx="256" cy="256" r="230" fill="#1F2937" />

      {/* Vinyl grooves */}
      <g opacity="0.3">
        <circle cx="256" cy="256" r="210" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="195" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="180" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="165" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="150" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="135" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="120" fill="none" stroke="#374151" strokeWidth="1" />
        <circle cx="256" cy="256" r="105" fill="none" stroke="#374151" strokeWidth="1" />
      </g>

      {/* Rainbow reflection */}
      <circle cx="256" cy="256" r="220" fill="url(#vinylRainbow)" />

      {/* Shine overlay */}
      <circle cx="256" cy="256" r="220" fill="url(#vinylShine)" />

      {/* Center label */}
      <circle cx="256" cy="256" r="80" fill="url(#labelGold)" />

      {/* Label inner ring */}
      <circle cx="256" cy="256" r="70" fill="none" stroke="#FEF3C7" strokeWidth="2" opacity="0.5" />

      {/* Label text area */}
      <circle cx="256" cy="256" r="55" fill="#D97706" />

      {/* SoundChain "S" hint on label */}
      <text
        x="256"
        y="270"
        textAnchor="middle"
        fontSize="50"
        fontWeight="bold"
        fill="#FEF3C7"
        fontFamily="Arial, sans-serif"
      >
        S
      </text>

      {/* Center hole */}
      <circle cx="256" cy="256" r="12" fill="#111827" />
      <circle cx="256" cy="256" r="8" fill="#1F2937" />

      {/* Sparkle reflections */}
      <circle fill="#FFFFFF" cx="180" cy="180" r="10" opacity="0.6" />
      <circle fill="#FFFFFF" cx="160" cy="200" r="6" opacity="0.4" />
      <circle fill="#EC4899" cx="340" cy="150" r="8" opacity="0.5" />
      <circle fill="#22D3EE" cx="360" cy="320" r="7" opacity="0.5" />
      <circle fill="#8B5CF6" cx="150" cy="340" r="6" opacity="0.5" />
    </svg>
  )
}
