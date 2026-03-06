/**
 * SoundChain Custom Stickers
 * Branded stickers and genre icons for the sticker picker
 */

interface SoundChainSticker {
  id: string
  name: string
  svg: string
  category: 'brand' | 'badge' | 'genre' | 'vibe' | 'crypto'
  animated?: boolean
}

// Convert SVG to data URL for inline use
const svgToDataUrl = (svg: string): string => {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

// SoundChain Logo (Infinity S)
const scLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="scGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <path fill="url(#scGrad)" d="M50 15c-19.3 0-35 15.7-35 35s15.7 35 35 35c9.7 0 18.4-3.9 24.7-10.3l-7-7C62.9 72.5 56.8 75 50 75c-13.8 0-25-11.2-25-25s11.2-25 25-25c6.8 0 12.9 2.5 17.7 7.3l7-7C68.4 18.9 59.7 15 50 15z"/>
  <path fill="url(#scGrad)" d="M50 35c-8.3 0-15 6.7-15 15s6.7 15 15 15c4.1 0 7.8-1.7 10.5-4.5l-7-7c-1 .9-2.2 1.5-3.5 1.5-2.8 0-5-2.2-5-5s2.2-5 5-5c1.3 0 2.5.6 3.5 1.5l7-7C57.8 36.7 54.1 35 50 35z"/>
  <circle fill="#22D3EE" cx="75" cy="50" r="8" opacity="0.8"/>
</svg>`

// OGUN Token
const ogunTokenSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="ogunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <circle fill="url(#ogunGrad)" cx="50" cy="50" r="45"/>
  <circle fill="none" stroke="#FEF3C7" stroke-width="2" cx="50" cy="50" r="38" opacity="0.5"/>
  <text x="50" y="62" text-anchor="middle" font-size="28" font-weight="bold" fill="#1F2937" font-family="Arial">Ø</text>
  <circle fill="#FEF3C7" cx="25" cy="25" r="5" opacity="0.6"/>
</svg>`

// Waveform
const waveformSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60">
  <defs>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect x="5" y="20" width="4" height="20" rx="2" fill="url(#waveGrad)"/>
  <rect x="12" y="10" width="4" height="40" rx="2" fill="url(#waveGrad)"/>
  <rect x="19" y="15" width="4" height="30" rx="2" fill="url(#waveGrad)"/>
  <rect x="26" y="5" width="4" height="50" rx="2" fill="url(#waveGrad)"/>
  <rect x="33" y="12" width="4" height="36" rx="2" fill="url(#waveGrad)"/>
  <rect x="40" y="8" width="4" height="44" rx="2" fill="url(#waveGrad)"/>
  <rect x="47" y="3" width="4" height="54" rx="2" fill="url(#waveGrad)"/>
  <rect x="54" y="8" width="4" height="44" rx="2" fill="url(#waveGrad)"/>
  <rect x="61" y="12" width="4" height="36" rx="2" fill="url(#waveGrad)"/>
  <rect x="68" y="5" width="4" height="50" rx="2" fill="url(#waveGrad)"/>
  <rect x="75" y="15" width="4" height="30" rx="2" fill="url(#waveGrad)"/>
  <rect x="82" y="10" width="4" height="40" rx="2" fill="url(#waveGrad)"/>
  <rect x="89" y="20" width="4" height="20" rx="2" fill="url(#waveGrad)"/>
</svg>`

// Gold Record
const goldRecordSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <circle fill="url(#goldGrad)" cx="50" cy="50" r="45"/>
  <circle fill="#1F2937" cx="50" cy="50" r="35"/>
  <circle fill="url(#goldGrad)" cx="50" cy="50" r="15"/>
  <circle fill="#1F2937" cx="50" cy="50" r="5"/>
  <circle fill="none" stroke="#FEF3C7" stroke-width="1" cx="50" cy="50" r="25" opacity="0.3"/>
  <circle fill="none" stroke="#FEF3C7" stroke-width="1" cx="50" cy="50" r="30" opacity="0.3"/>
  <circle fill="#FEF3C7" cx="25" cy="25" r="8" opacity="0.4"/>
</svg>`

// Platinum Record
const platinumRecordSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="platGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5E7EB"/>
      <stop offset="50%" stop-color="#9CA3AF"/>
      <stop offset="100%" stop-color="#6B7280"/>
    </linearGradient>
  </defs>
  <circle fill="url(#platGrad)" cx="50" cy="50" r="45"/>
  <circle fill="#1F2937" cx="50" cy="50" r="35"/>
  <circle fill="url(#platGrad)" cx="50" cy="50" r="15"/>
  <circle fill="#1F2937" cx="50" cy="50" r="5"/>
  <circle fill="none" stroke="#FFF" stroke-width="1" cx="50" cy="50" r="25" opacity="0.3"/>
  <circle fill="none" stroke="#FFF" stroke-width="1" cx="50" cy="50" r="30" opacity="0.3"/>
  <circle fill="#FFF" cx="25" cy="25" r="8" opacity="0.5"/>
</svg>`

// Diamond Record
const diamondRecordSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="diamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="25%" stop-color="#A5B4FC"/>
      <stop offset="50%" stop-color="#F0ABFC"/>
      <stop offset="75%" stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#6EE7B7"/>
    </linearGradient>
  </defs>
  <circle fill="url(#diamGrad)" cx="50" cy="50" r="45"/>
  <circle fill="#1F2937" cx="50" cy="50" r="35"/>
  <circle fill="url(#diamGrad)" cx="50" cy="50" r="15"/>
  <circle fill="#1F2937" cx="50" cy="50" r="5"/>
  <circle fill="none" stroke="#FFF" stroke-width="1" cx="50" cy="50" r="25" opacity="0.4"/>
  <circle fill="none" stroke="#FFF" stroke-width="1" cx="50" cy="50" r="30" opacity="0.4"/>
  <circle fill="#FFF" cx="25" cy="25" r="10" opacity="0.6"/>
  <circle fill="#FFF" cx="70" cy="35" r="5" opacity="0.4"/>
</svg>`

// Verified Artist Badge
const verifiedBadgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="verGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="100%" stop-color="#0891B2"/>
    </linearGradient>
  </defs>
  <circle fill="url(#verGrad)" cx="50" cy="50" r="45"/>
  <path fill="#FFF" d="M45 60L35 50l-5 5 15 15 30-30-5-5-25 25z"/>
  <circle fill="#FFF" cx="25" cy="25" r="5" opacity="0.5"/>
</svg>`

// Fire Track
const fireTrackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
  </defs>
  <path fill="url(#fireGrad)" d="M50 5c-5 15-20 25-20 45 0 22 18 40 40 40s40-18 40-40c0-20-15-30-20-45-3 10-10 15-20 15s-17-5-20-15z"/>
  <path fill="#FCD34D" d="M50 35c-3 10-12 15-12 28 0 13 10 22 22 22s22-9 22-22c0-13-9-18-12-28-2 6-6 9-10 9s-8-3-10-9z"/>
  <ellipse fill="#FEF3C7" cx="50" cy="75" rx="8" ry="12" opacity="0.8"/>
</svg>`

// Hip-Hop Crown
const hipHopCrownSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80">
  <defs>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <path fill="url(#crownGrad)" d="M5 70L15 25l20 20 15-35 15 35 20-20 10 45z"/>
  <circle fill="#EF4444" cx="15" cy="25" r="6"/>
  <circle fill="#22D3EE" cx="50" cy="10" r="6"/>
  <circle fill="#10B981" cx="85" cy="25" r="6"/>
  <rect fill="#B45309" x="10" y="65" width="80" height="10" rx="2"/>
  <circle fill="#FEF3C7" cx="30" cy="50" r="3" opacity="0.6"/>
  <circle fill="#FEF3C7" cx="70" cy="50" r="3" opacity="0.6"/>
</svg>`

// EDM Lightning
const edmLightningSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
  <defs>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <path fill="url(#boltGrad)" d="M45 5L10 55h25L25 95l45-55H45z"/>
  <path fill="#FFF" d="M40 20L20 50h15L30 75l30-35H40z" opacity="0.3"/>
  <circle fill="#FFF" cx="60" cy="20" r="4" opacity="0.8"/>
  <circle fill="#FFF" cx="70" cy="35" r="3" opacity="0.6"/>
</svg>`

// Rock Guitar
const rockGuitarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="guitarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#B91C1C"/>
    </linearGradient>
  </defs>
  <path fill="url(#guitarGrad)" d="M70 10l15 5-5 15-10-5v15c5 3 10 10 10 20 0 15-12 30-30 35-18-5-30-20-30-35 0-10 5-17 10-20V25l-10 5-5-15 15-5 10 10h20z"/>
  <ellipse fill="#1F2937" cx="50" cy="70" rx="12" ry="8"/>
  <rect fill="#FCD34D" x="47" y="25" width="6" height="30" rx="1"/>
  <circle fill="#FCD34D" cx="50" cy="20" r="4"/>
  <line x1="48" y1="30" x2="48" y2="50" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="50" y1="30" x2="50" y2="50" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="52" y1="30" x2="52" y2="50" stroke="#9CA3AF" stroke-width="1"/>
</svg>`

// R&B Heart
const rnbHeartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="rnbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#BE185D"/>
    </linearGradient>
  </defs>
  <path fill="url(#rnbGrad)" d="M50 90L15 55C5 45 5 25 20 15c10-7 22-3 30 10 8-13 20-17 30-10 15 10 15 30 5 40z"/>
  <path fill="#FFF" d="M35 30c-8 0-15 7-15 15 0 3 1 6 3 9l27 27 27-27c2-3 3-6 3-9 0-8-7-15-15-15-5 0-10 3-12 7h-6c-2-4-7-7-12-7z" opacity="0.2"/>
  <circle fill="#FFF" cx="30" cy="35" r="6" opacity="0.5"/>
</svg>`

// Jazz Saxophone
const jazzSaxSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
  <defs>
    <linearGradient id="saxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <path fill="url(#saxGrad)" d="M60 5c5 0 10 5 10 10v5l-15 25v30c0 15-10 25-25 25-10 0-18-8-18-18 0-8 5-14 12-16V50L10 35V20c0-5 5-10 10-10l5 5v15l15 15v20c3-2 6-3 10-3 8 0 15 7 15 15v3c5-3 8-8 8-15V40l15-25V10c0-3-3-5-5-5z"/>
  <circle fill="#1F2937" cx="30" cy="82" r="8"/>
  <circle fill="#FEF3C7" cx="55" cy="15" r="3" opacity="0.6"/>
  <ellipse fill="#1F2937" cx="35" cy="45" rx="3" ry="4"/>
  <ellipse fill="#1F2937" cx="40" cy="55" rx="3" ry="4"/>
</svg>`

// Country Boot
const countryBootSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#92400E"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <path fill="url(#bootGrad)" d="M80 30v35H60v25H10V65c0-15 10-25 25-25h10V30c0-15 10-25 25-25h5v20c0 3 2 5 5 5z"/>
  <rect fill="#FCD34D" x="40" y="35" width="20" height="5"/>
  <path fill="#1F2937" d="M60 90H10v-5c0-2 2-4 4-4h42c2 0 4 2 4 4z"/>
  <ellipse fill="#FEF3C7" cx="65" cy="20" rx="5" ry="8" opacity="0.3"/>
</svg>`

// Pop Star
const popStarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <path fill="url(#starGrad)" d="M50 5l12 36h38l-31 22 12 36-31-22-31 22 12-36L0 41h38z"/>
  <path fill="#FEF3C7" d="M50 15l8 24h26l-21 15 8 24-21-15-21 15 8-24-21-15h26z" opacity="0.3"/>
  <circle fill="#FFF" cx="35" cy="35" r="4" opacity="0.8"/>
</svg>`

// Reggae Lion
const reggaeLionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="reggaeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="50%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#EF4444"/>
    </linearGradient>
  </defs>
  <circle fill="url(#reggaeGrad)" cx="50" cy="50" r="45"/>
  <circle fill="#FCD34D" cx="50" cy="55" r="25"/>
  <ellipse fill="#D97706" cx="50" cy="60" rx="15" ry="12"/>
  <circle fill="#1F2937" cx="40" cy="50" r="4"/>
  <circle fill="#1F2937" cx="60" cy="50" r="4"/>
  <ellipse fill="#1F2937" cx="50" cy="62" rx="5" ry="3"/>
  <path fill="#D97706" d="M25 30c5-10 15-15 25-15s20 5 25 15c-8-5-16-8-25-8s-17 3-25 8z"/>
</svg>`

// Classical Music Note
const classicalNoteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
  <defs>
    <linearGradient id="classGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1F2937"/>
      <stop offset="100%" stop-color="#374151"/>
    </linearGradient>
  </defs>
  <ellipse fill="url(#classGrad)" cx="25" cy="80" rx="20" ry="15" transform="rotate(-20 25 80)"/>
  <rect fill="url(#classGrad)" x="40" y="15" width="5" height="65"/>
  <path fill="url(#classGrad)" d="M45 15c15 0 25 10 25 25-10-5-20-5-25 0V15z"/>
  <ellipse fill="#FCD34D" cx="25" cy="80" rx="8" ry="6" transform="rotate(-20 25 80)" opacity="0.3"/>
</svg>`

// Latin Maracas
const latinMaracasSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="maracaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="50%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
  </defs>
  <ellipse fill="url(#maracaGrad)" cx="30" cy="35" rx="20" ry="25"/>
  <rect fill="#92400E" x="25" y="55" width="10" height="40" rx="3"/>
  <ellipse fill="url(#maracaGrad)" cx="70" cy="35" rx="20" ry="25"/>
  <rect fill="#92400E" x="65" y="55" width="10" height="40" rx="3"/>
  <circle fill="#FFF" cx="25" cy="30" r="4" opacity="0.5"/>
  <circle fill="#FFF" cx="65" cy="30" r="4" opacity="0.5"/>
</svg>`

// Diamond Hands (Crypto)
const diamondHandsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="diamHandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67E8F9"/>
      <stop offset="50%" stop-color="#A5B4FC"/>
      <stop offset="100%" stop-color="#F0ABFC"/>
    </linearGradient>
  </defs>
  <path fill="#FCD34D" d="M50 95L20 60V45l10-10h40l10 10v15z"/>
  <path fill="url(#diamHandGrad)" d="M50 5L25 30h50z"/>
  <path fill="url(#diamHandGrad)" d="M25 30l25 35 25-35z" opacity="0.8"/>
  <path fill="#FFF" d="M40 20l10 15 10-15z" opacity="0.4"/>
  <circle fill="#FFF" cx="35" cy="25" r="3" opacity="0.6"/>
</svg>`

// To The Moon Rocket
const toTheMoonSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E5E7EB"/>
      <stop offset="100%" stop-color="#9CA3AF"/>
    </linearGradient>
  </defs>
  <path fill="url(#rocketGrad)" d="M50 5c-10 10-15 30-15 50v20h30V55c0-20-5-40-15-50z"/>
  <circle fill="#22D3EE" cx="50" cy="45" r="10"/>
  <circle fill="#1F2937" cx="50" cy="45" r="6"/>
  <path fill="#EF4444" d="M35 75v20l15-10 15 10V75z"/>
  <path fill="#F59E0B" d="M40 85v10l10-7 10 7V85z"/>
  <path fill="#6B7280" d="M35 55c-10 5-15 15-15 20h15z"/>
  <path fill="#6B7280" d="M65 55c10 5 15 15 15 20H65z"/>
</svg>`

// Whale (Crypto)
const whaleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80">
  <defs>
    <linearGradient id="whaleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <ellipse fill="url(#whaleGrad)" cx="50" cy="45" rx="45" ry="30"/>
  <path fill="url(#whaleGrad)" d="M90 30c10-15 10-25 5-25-10 5-15 15-15 25z"/>
  <circle fill="#1F2937" cx="25" cy="40" r="5"/>
  <circle fill="#FFF" cx="23" cy="38" r="2"/>
  <path fill="#67E8F9" d="M50 10c-5-10 0-10 5 0l-2.5 5z" opacity="0.8"/>
  <path fill="#67E8F9" d="M55 8c-3-8 2-8 5 0l-2 4z" opacity="0.6"/>
</svg>`

// LFG (Let's F***ing Go)
const lfgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <defs>
    <linearGradient id="lfgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect fill="#1F2937" x="2" y="2" width="96" height="46" rx="10"/>
  <text x="50" y="35" text-anchor="middle" font-size="24" font-weight="bold" fill="url(#lfgGrad)" font-family="Arial">LFG!</text>
</svg>`

// WAGMI
const wagmiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50">
  <defs>
    <linearGradient id="wagmiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect fill="#1F2937" x="2" y="2" width="116" height="46" rx="10"/>
  <text x="60" y="35" text-anchor="middle" font-size="20" font-weight="bold" fill="url(#wagmiGrad)" font-family="Arial">WAGMI</text>
</svg>`

// GM (Good Morning)
const gmSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <circle fill="url(#sunGrad)" cx="50" cy="50" r="30"/>
  <g fill="#FCD34D">
    <rect x="47" y="5" width="6" height="15" rx="3"/>
    <rect x="47" y="80" width="6" height="15" rx="3"/>
    <rect x="5" y="47" width="15" height="6" rx="3"/>
    <rect x="80" y="47" width="15" height="6" rx="3"/>
    <rect x="15" y="15" width="6" height="15" rx="3" transform="rotate(45 18 22)"/>
    <rect x="79" y="15" width="6" height="15" rx="3" transform="rotate(-45 82 22)"/>
    <rect x="15" y="70" width="6" height="15" rx="3" transform="rotate(-45 18 77)"/>
    <rect x="79" y="70" width="6" height="15" rx="3" transform="rotate(45 82 77)"/>
  </g>
  <text x="50" y="58" text-anchor="middle" font-size="20" font-weight="bold" fill="#1F2937" font-family="Arial">GM</text>
</svg>`

// Define all stickers
export const SOUNDCHAIN_STICKERS: SoundChainSticker[] = [
  // Brand
  { id: 'sc-logo', name: 'SoundChain', svg: scLogoSvg, category: 'brand' },
  { id: 'sc-ogun', name: 'OGUN', svg: ogunTokenSvg, category: 'brand' },
  { id: 'sc-wave', name: 'Waveform', svg: waveformSvg, category: 'brand' },
  { id: 'sc-fire', name: 'Fire Track', svg: fireTrackSvg, category: 'brand' },

  // Badges
  { id: 'sc-gold', name: 'Gold Record', svg: goldRecordSvg, category: 'badge' },
  { id: 'sc-plat', name: 'Platinum', svg: platinumRecordSvg, category: 'badge' },
  { id: 'sc-diamond', name: 'Diamond', svg: diamondRecordSvg, category: 'badge' },
  { id: 'sc-verified', name: 'Verified', svg: verifiedBadgeSvg, category: 'badge' },

  // Genre
  { id: 'sc-hiphop', name: 'Hip-Hop', svg: hipHopCrownSvg, category: 'genre' },
  { id: 'sc-edm', name: 'EDM', svg: edmLightningSvg, category: 'genre' },
  { id: 'sc-rock', name: 'Rock', svg: rockGuitarSvg, category: 'genre' },
  { id: 'sc-rnb', name: 'R&B', svg: rnbHeartSvg, category: 'genre' },
  { id: 'sc-jazz', name: 'Jazz', svg: jazzSaxSvg, category: 'genre' },
  { id: 'sc-country', name: 'Country', svg: countryBootSvg, category: 'genre' },
  { id: 'sc-pop', name: 'Pop', svg: popStarSvg, category: 'genre' },
  { id: 'sc-reggae', name: 'Reggae', svg: reggaeLionSvg, category: 'genre' },
  { id: 'sc-classical', name: 'Classical', svg: classicalNoteSvg, category: 'genre' },
  { id: 'sc-latin', name: 'Latin', svg: latinMaracasSvg, category: 'genre' },

  // Crypto/Web3 Vibes
  { id: 'sc-diamond-hands', name: 'Diamond Hands', svg: diamondHandsSvg, category: 'crypto' },
  { id: 'sc-moon', name: 'To The Moon', svg: toTheMoonSvg, category: 'crypto' },
  { id: 'sc-whale', name: 'Whale', svg: whaleSvg, category: 'crypto' },
  { id: 'sc-lfg', name: 'LFG', svg: lfgSvg, category: 'crypto' },
  { id: 'sc-wagmi', name: 'WAGMI', svg: wagmiSvg, category: 'crypto' },
  { id: 'sc-gm', name: 'GM', svg: gmSvg, category: 'crypto' },
]

// Get stickers as normalized emotes for the picker
export const getSoundChainStickers = () => {
  return SOUNDCHAIN_STICKERS.map(sticker => ({
    id: sticker.id,
    name: sticker.name,
    url: svgToDataUrl(sticker.svg),
    animated: sticker.animated || false,
    source: 'soundchain' as const,
    category: sticker.category,
  }))
}

// Get stickers by category
export const getStickersByCategory = (category: SoundChainSticker['category']) => {
  return SOUNDCHAIN_STICKERS
    .filter(s => s.category === category)
    .map(sticker => ({
      id: sticker.id,
      name: sticker.name,
      url: svgToDataUrl(sticker.svg),
      animated: sticker.animated || false,
      source: 'soundchain' as const,
    }))
}
