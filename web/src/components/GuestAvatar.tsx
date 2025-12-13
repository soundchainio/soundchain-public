import React, { useEffect, useRef, useState, useCallback } from 'react'
import jazzicon from '@metamask/jazzicon'

const GUEST_AVATAR_STORAGE_KEY = 'soundchain_guest_avatars'
const MAX_AVATAR_SIZE = 100 // Max width/height in pixels

interface GuestAvatarProps {
  walletAddress: string
  pixels?: number
  className?: string
  editable?: boolean // Allow clicking to upload custom avatar
}

/**
 * Get all stored guest avatars from localStorage
 */
const getStoredAvatars = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(GUEST_AVATAR_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Store a guest avatar in localStorage
 */
const storeAvatar = (walletAddress: string, base64Image: string): void => {
  try {
    const avatars = getStoredAvatars()
    avatars[walletAddress.toLowerCase()] = base64Image
    localStorage.setItem(GUEST_AVATAR_STORAGE_KEY, JSON.stringify(avatars))
  } catch (e) {
    console.error('Failed to store guest avatar:', e)
  }
}

/**
 * Get a stored avatar for a wallet address
 */
const getStoredAvatar = (walletAddress: string): string | null => {
  const avatars = getStoredAvatars()
  return avatars[walletAddress.toLowerCase()] || null
}

/**
 * Resize and compress an image file to a base64 string
 */
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Scale down to max size while maintaining aspect ratio
        if (width > height && width > MAX_AVATAR_SIZE) {
          height = (height * MAX_AVATAR_SIZE) / width
          width = MAX_AVATAR_SIZE
        } else if (height > MAX_AVATAR_SIZE) {
          width = (width * MAX_AVATAR_SIZE) / height
          height = MAX_AVATAR_SIZE
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert to base64 with compression
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Generates a unique avatar from a wallet address using MetaMask's jazzicon.
 * Supports custom avatars stored locally on the user's device.
 * Used for guest users who interact without a SoundChain account.
 */
export const GuestAvatar = ({ walletAddress, pixels = 30, className = '', editable = false }: GuestAvatarProps) => {
  const avatarRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customAvatar, setCustomAvatar] = useState<string | null>(null)

  // Check for stored custom avatar on mount
  useEffect(() => {
    if (walletAddress) {
      const stored = getStoredAvatar(walletAddress)
      setCustomAvatar(stored)
    }
  }, [walletAddress])

  // Generate jazzicon if no custom avatar
  useEffect(() => {
    if (avatarRef.current && walletAddress && !customAvatar) {
      avatarRef.current.innerHTML = ''
      const seed = parseInt(walletAddress.slice(2, 10), 16)
      const icon = jazzicon(pixels, seed)
      avatarRef.current.appendChild(icon)
    }
  }, [walletAddress, pixels, customAvatar])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !walletAddress) return

    try {
      const base64 = await resizeImage(file)
      storeAvatar(walletAddress, base64)
      setCustomAvatar(base64)
    } catch (err) {
      console.error('Failed to process avatar image:', err)
    }
  }, [walletAddress])

  const handleClick = useCallback(() => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [editable])

  return (
    <>
      <div
        ref={customAvatar ? undefined : avatarRef}
        className={`flex-shrink-0 rounded-full overflow-hidden ${editable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
        style={{ width: pixels, height: pixels }}
        title={editable ? 'Click to upload custom avatar' : `Guest: ${formatWalletAddress(walletAddress)}`}
        onClick={handleClick}
      >
        {customAvatar && (
          <img
            src={customAvatar}
            alt="Guest avatar"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      )}
    </>
  )
}

/**
 * Formats a wallet address for display (0x1234...5678)
 */
export const formatWalletAddress = (address: string): string => {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Hook to manage guest avatar for the current connected wallet
 */
export const useGuestAvatar = (walletAddress: string | null) => {
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (walletAddress) {
      setAvatar(getStoredAvatar(walletAddress))
    } else {
      setAvatar(null)
    }
  }, [walletAddress])

  const updateAvatar = useCallback(async (file: File) => {
    if (!walletAddress) return
    const base64 = await resizeImage(file)
    storeAvatar(walletAddress, base64)
    setAvatar(base64)
  }, [walletAddress])

  const clearAvatar = useCallback(() => {
    if (!walletAddress) return
    const avatars = getStoredAvatars()
    delete avatars[walletAddress.toLowerCase()]
    localStorage.setItem(GUEST_AVATAR_STORAGE_KEY, JSON.stringify(avatars))
    setAvatar(null)
  }, [walletAddress])

  return { avatar, updateAvatar, clearAvatar }
}

/**
 * Check if a guest avatar exists for a wallet address.
 * Use this during signup to migrate the avatar to the user's profile.
 */
export const getGuestAvatarForMigration = (walletAddress: string): string | null => {
  return getStoredAvatar(walletAddress)
}

/**
 * Clear guest avatar after successful migration to profile.
 * Call this after the avatar has been saved to the user's profile.
 */
export const clearGuestAvatarAfterMigration = (walletAddress: string): void => {
  try {
    const avatars = getStoredAvatars()
    delete avatars[walletAddress.toLowerCase()]
    localStorage.setItem(GUEST_AVATAR_STORAGE_KEY, JSON.stringify(avatars))
  } catch (e) {
    console.error('Failed to clear guest avatar after migration:', e)
  }
}

/**
 * Convert a base64 image to a File object for upload.
 * Use this to convert the guest avatar to a format suitable for the profile picture API.
 */
export const base64ToFile = (base64: string, filename: string = 'avatar.jpg'): File => {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}
