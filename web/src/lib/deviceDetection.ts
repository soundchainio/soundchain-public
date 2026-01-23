/**
 * Device Detection Utilities
 * Detects device type including TV, mobile, tablet, and desktop
 * Used for device-specific rendering and optimizations
 */

export type DeviceType = 'tv' | 'mobile' | 'tablet' | 'desktop'

interface DeviceInfo {
  type: DeviceType
  isTV: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  isTouchDevice: boolean
  supportsHover: boolean
  // TV-specific
  is4K: boolean
  is8K: boolean
  aspectRatio: number
}

// Common TV user agents and keywords
const TV_USER_AGENTS = [
  'SmartTV',
  'WebTV',
  'GoogleTV',
  'AppleTV',
  'BRAVIA',
  'Philips',
  'Hisense',
  'VIDAA',
  'Roku',
  'Tizen',
  'Web0S',
  'webOS',
  'LG Browser',
  'Samsung',
  'Vizio',
  'FireTV',
  'Fire TV',
  'AFTT', // Amazon Fire TV
  'AFTS', // Amazon Fire TV Stick
  'Android TV',
  'Chromecast',
  'CrKey', // Chromecast
  'PlayStation',
  'Xbox',
  'Nintendo',
]

// Resolution thresholds
const RESOLUTIONS = {
  HD: { width: 1280, height: 720 },
  FHD: { width: 1920, height: 1080 },
  QHD: { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 },
  '8K': { width: 7680, height: 4320 },
}

/**
 * Check if the user agent indicates a TV device
 */
const checkTVUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return TV_USER_AGENTS.some(tv => ua.includes(tv.toLowerCase()))
}

/**
 * Check screen characteristics that indicate a TV
 * TVs typically have large screens with specific aspect ratios
 */
const checkTVScreenCharacteristics = (): boolean => {
  if (typeof window === 'undefined') return false

  const width = window.screen.width
  const height = window.screen.height
  const pixelRatio = window.devicePixelRatio || 1

  // Actual physical pixels
  const physicalWidth = width * pixelRatio
  const physicalHeight = height * pixelRatio

  // TVs typically have 16:9 aspect ratio and large screens
  const aspectRatio = width / height
  const is16by9 = Math.abs(aspectRatio - 16 / 9) < 0.05

  // Large screen check (4K+ or very wide viewport)
  const isLargeScreen = physicalWidth >= RESOLUTIONS['4K'].width || width >= 1920

  // TVs usually don't support hover (no mouse)
  const noHover = !window.matchMedia('(hover: hover)').matches

  // TVs usually don't have touch
  const noTouch = !('ontouchstart' in window)

  // High confidence TV indicators
  if (is16by9 && isLargeScreen && noHover && noTouch) {
    return true
  }

  return false
}

/**
 * Detect the device type
 */
export const detectDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop'

  // Check TV first
  if (checkTVUserAgent() || checkTVScreenCharacteristics()) {
    return 'tv'
  }

  // Check mobile
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

  // Check if tablet based on screen size
  const width = window.innerWidth
  if (isMobileUA) {
    if (width >= 768) return 'tablet'
    return 'mobile'
  }

  return 'desktop'
}

/**
 * Get comprehensive device information
 */
export const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      type: 'desktop',
      isTV: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1,
      isTouchDevice: false,
      supportsHover: true,
      is4K: false,
      is8K: false,
      aspectRatio: 16 / 9,
    }
  }

  const type = detectDeviceType()
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const pixelRatio = window.devicePixelRatio || 1
  const physicalWidth = screenWidth * pixelRatio
  const physicalHeight = screenHeight * pixelRatio

  return {
    type,
    isTV: type === 'tv',
    isMobile: type === 'mobile',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
    screenWidth,
    screenHeight,
    pixelRatio,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    supportsHover: window.matchMedia('(hover: hover)').matches,
    is4K: physicalWidth >= RESOLUTIONS['4K'].width,
    is8K: physicalWidth >= RESOLUTIONS['8K'].width,
    aspectRatio: screenWidth / screenHeight,
  }
}

/**
 * Hook-friendly function to check if device is TV
 * Can be used in React components
 */
export const isTV = (): boolean => {
  return detectDeviceType() === 'tv'
}

/**
 * Get recommended settings for the device type
 */
export const getDeviceSettings = (): {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
  spacing: 'compact' | 'normal' | 'spacious'
  animations: boolean
  touchTargetSize: number
  iconSize: number
  avatarSize: number
  maxFeedWidth: number | null
} => {
  const device = getDeviceInfo()

  if (device.isTV) {
    return {
      fontSize: 'xlarge',
      spacing: 'spacious',
      animations: true, // TVs can handle animations
      touchTargetSize: 80, // Large for remote control navigation
      iconSize: 32,
      avatarSize: 64,
      maxFeedWidth: null, // Full width on TV
    }
  }

  if (device.isMobile) {
    return {
      fontSize: 'small',
      spacing: 'compact',
      animations: false, // Reduce for battery
      touchTargetSize: 44, // iOS minimum
      iconSize: 20,
      avatarSize: 32,
      maxFeedWidth: null, // Full width on mobile
    }
  }

  if (device.isTablet) {
    return {
      fontSize: 'medium',
      spacing: 'normal',
      animations: true,
      touchTargetSize: 44,
      iconSize: 24,
      avatarSize: 40,
      maxFeedWidth: 614, // Instagram-like max width
    }
  }

  // Desktop
  return {
    fontSize: 'medium',
    spacing: 'normal',
    animations: true,
    touchTargetSize: 32,
    iconSize: 20,
    avatarSize: 32,
    maxFeedWidth: 614,
  }
}

/**
 * TV-specific layout values
 * Use these when rendering the TV version of components
 */
export const TV_LAYOUT = {
  // Typography
  fontSize: {
    xs: '16px',
    sm: '18px',
    base: '22px',
    lg: '28px',
    xl: '36px',
    '2xl': '48px',
    '3xl': '64px',
  },
  // Spacing (rem-based for scaling)
  spacing: {
    xs: '0.75rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
  // Component sizes
  avatar: {
    small: 48,
    medium: 64,
    large: 96,
  },
  icon: {
    small: 24,
    medium: 32,
    large: 48,
  },
  // Touch/focus targets for D-pad navigation
  focusTarget: {
    minWidth: 80,
    minHeight: 80,
    padding: 16,
  },
  // Grid layout for 4K/8K
  grid: {
    columns: {
      '1080p': 3,
      '4K': 4,
      '8K': 5,
    },
    gap: '2rem',
  },
  // Safe area margins (for TV overscan)
  safeArea: {
    horizontal: '5%',
    vertical: '3%',
  },
}
