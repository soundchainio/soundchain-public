export const Microphone = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
      <defs>
        <linearGradient id="micBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5E7EB" />
          <stop offset="50%" stopColor="#9CA3AF" />
          <stop offset="100%" stopColor="#6B7280" />
        </linearGradient>
        <linearGradient id="micGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="micGrill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#1F2937" />
        </linearGradient>
      </defs>

      {/* Mic head (grill) */}
      <ellipse cx="256" cy="140" rx="100" ry="120" fill="url(#micGrill)" />

      {/* Grill pattern */}
      <g opacity="0.3">
        <line x1="176" y1="80" x2="336" y2="80" stroke="#6B7280" strokeWidth="3" />
        <line x1="166" y1="100" x2="346" y2="100" stroke="#6B7280" strokeWidth="3" />
        <line x1="160" y1="120" x2="352" y2="120" stroke="#6B7280" strokeWidth="3" />
        <line x1="158" y1="140" x2="354" y2="140" stroke="#6B7280" strokeWidth="3" />
        <line x1="160" y1="160" x2="352" y2="160" stroke="#6B7280" strokeWidth="3" />
        <line x1="166" y1="180" x2="346" y2="180" stroke="#6B7280" strokeWidth="3" />
        <line x1="176" y1="200" x2="336" y2="200" stroke="#6B7280" strokeWidth="3" />
        <line x1="190" y1="220" x2="322" y2="220" stroke="#6B7280" strokeWidth="3" />
      </g>

      {/* Gold ring */}
      <ellipse cx="256" cy="250" rx="85" ry="20" fill="url(#micGold)" />
      <ellipse cx="256" cy="250" rx="75" ry="15" fill="none" stroke="#FEF3C7" strokeWidth="2" opacity="0.5" />

      {/* Handle */}
      <rect x="216" y="260" width="80" height="200" rx="10" fill="url(#micBody)" />

      {/* Handle details */}
      <rect x="226" y="280" width="60" height="160" rx="5" fill="#4B5563" />

      {/* Handle grip lines */}
      <g opacity="0.4">
        <rect x="236" y="300" width="40" height="4" rx="2" fill="#9CA3AF" />
        <rect x="236" y="320" width="40" height="4" rx="2" fill="#9CA3AF" />
        <rect x="236" y="340" width="40" height="4" rx="2" fill="#9CA3AF" />
        <rect x="236" y="360" width="40" height="4" rx="2" fill="#9CA3AF" />
        <rect x="236" y="380" width="40" height="4" rx="2" fill="#9CA3AF" />
        <rect x="236" y="400" width="40" height="4" rx="2" fill="#9CA3AF" />
        <rect x="236" y="420" width="40" height="4" rx="2" fill="#9CA3AF" />
      </g>

      {/* Bottom cap */}
      <ellipse cx="256" cy="460" rx="40" ry="12" fill="#374151" />

      {/* Highlight shine */}
      <ellipse cx="200" cy="120" rx="15" ry="40" fill="#FFFFFF" opacity="0.15" />

      {/* Sparkles */}
      <circle fill="#FCD34D" cx="340" cy="100" r="8" opacity="0.8" />
      <circle fill="#FCD34D" cx="360" cy="140" r="5" opacity="0.6" />
      <circle fill="#FFFFFF" cx="180" cy="60" r="6" opacity="0.7" />
    </svg>
  )
}
