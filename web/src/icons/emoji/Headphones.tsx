export const Headphones = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
      <defs>
        <linearGradient id="hpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
        <linearGradient id="hpCushion" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="hpShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Headband */}
      <path
        fill="url(#hpGradient)"
        d="M256,56c-99.4,0-180,80.6-180,180v20h30v-20c0-82.7,67.3-150,150-150s150,67.3,150,150v20h30v-20
        C436,136.6,355.4,56,256,56z"
      />

      {/* Headband shine */}
      <path
        fill="url(#hpShine)"
        d="M256,56c-99.4,0-180,80.6-180,180v20h15v-20c0-91,74-165,165-165s165,74,165,165v20h15v-20
        C436,136.6,355.4,56,256,56z"
      />

      {/* Left ear cup outer */}
      <rect x="56" y="236" rx="20" ry="20" width="80" height="160" fill="#1F2937" />

      {/* Left ear cup inner */}
      <rect x="66" y="256" rx="15" ry="15" width="60" height="120" fill="url(#hpCushion)" />

      {/* Left cushion highlight */}
      <ellipse fill="#FFFFFF" opacity="0.2" cx="96" cy="290" rx="20" ry="30" />

      {/* Right ear cup outer */}
      <rect x="376" y="236" rx="20" ry="20" width="80" height="160" fill="#1F2937" />

      {/* Right ear cup inner */}
      <rect x="386" y="256" rx="15" ry="15" width="60" height="120" fill="url(#hpCushion)" />

      {/* Right cushion highlight */}
      <ellipse fill="#FFFFFF" opacity="0.2" cx="416" cy="290" rx="20" ry="30" />

      {/* Sound waves left */}
      <path
        fill="none"
        stroke="#22D3EE"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.6"
        d="M130,316c15-20,15-40,0-60"
      />
      <path
        fill="none"
        stroke="#22D3EE"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.4"
        d="M150,316c20-25,20-50,0-75"
      />

      {/* Sound waves right */}
      <path
        fill="none"
        stroke="#22D3EE"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.6"
        d="M382,316c-15-20-15-40,0-60"
      />
      <path
        fill="none"
        stroke="#22D3EE"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.4"
        d="M362,316c-20-25-20-50,0-75"
      />

      {/* Sparkle */}
      <circle fill="#FFFFFF" cx="256" cy="80" r="6" opacity="0.8" />
    </svg>
  )
}
