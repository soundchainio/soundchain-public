/**
 * React Hook for Device Type Detection
 * Provides reactive device information for conditional rendering
 */

import { useState, useEffect } from 'react'
import {
  DeviceType,
  getDeviceInfo,
  getDeviceSettings,
  detectDeviceType,
  TV_LAYOUT,
} from 'lib/deviceDetection'

interface UseDeviceTypeReturn {
  deviceType: DeviceType
  isTV: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  is4K: boolean
  is8K: boolean
  supportsHover: boolean
  isTouchDevice: boolean
  settings: ReturnType<typeof getDeviceSettings>
  tvLayout: typeof TV_LAYOUT
}

/**
 * Hook to detect and react to device type changes
 * Updates on window resize and orientation change
 */
export const useDeviceType = (): UseDeviceTypeReturn => {
  const [deviceInfo, setDeviceInfo] = useState(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') {
      return {
        type: 'desktop' as DeviceType,
        isTV: false,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        is4K: false,
        is8K: false,
        supportsHover: true,
        isTouchDevice: false,
      }
    }
    const info = getDeviceInfo()
    return {
      type: info.type,
      isTV: info.isTV,
      isMobile: info.isMobile,
      isTablet: info.isTablet,
      isDesktop: info.isDesktop,
      is4K: info.is4K,
      is8K: info.is8K,
      supportsHover: info.supportsHover,
      isTouchDevice: info.isTouchDevice,
    }
  })

  useEffect(() => {
    const updateDeviceInfo = () => {
      const info = getDeviceInfo()
      setDeviceInfo({
        type: info.type,
        isTV: info.isTV,
        isMobile: info.isMobile,
        isTablet: info.isTablet,
        isDesktop: info.isDesktop,
        is4K: info.is4K,
        is8K: info.is8K,
        supportsHover: info.supportsHover,
        isTouchDevice: info.isTouchDevice,
      })
    }

    // Update on mount
    updateDeviceInfo()

    // Listen for resize (e.g., TV scaling changes)
    window.addEventListener('resize', updateDeviceInfo)

    // Listen for orientation changes (tablet/mobile)
    window.addEventListener('orientationchange', updateDeviceInfo)

    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
    }
  }, [])

  return {
    deviceType: deviceInfo.type,
    isTV: deviceInfo.isTV,
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isDesktop: deviceInfo.isDesktop,
    is4K: deviceInfo.is4K,
    is8K: deviceInfo.is8K,
    supportsHover: deviceInfo.supportsHover,
    isTouchDevice: deviceInfo.isTouchDevice,
    settings: getDeviceSettings(),
    tvLayout: TV_LAYOUT,
  }
}

/**
 * Simple hook that returns true only if device is a TV
 * Lighter weight than full useDeviceType
 */
export const useIsTV = (): boolean => {
  const [isTV, setIsTV] = useState(false)

  useEffect(() => {
    setIsTV(detectDeviceType() === 'tv')
  }, [])

  return isTV
}

/**
 * Hook for TV-specific conditional rendering
 * Returns null component wrapper for non-TV devices
 */
export const useTVOnly = <T,>(component: T): T | null => {
  const isTV = useIsTV()
  return isTV ? component : null
}

/**
 * Hook for mobile-specific conditional rendering
 */
export const useMobileOnly = <T,>(component: T): T | null => {
  const { isMobile } = useDeviceType()
  return isMobile ? component : null
}

/**
 * Hook for desktop-specific conditional rendering
 */
export const useDesktopOnly = <T,>(component: T): T | null => {
  const { isDesktop } = useDeviceType()
  return isDesktop ? component : null
}
