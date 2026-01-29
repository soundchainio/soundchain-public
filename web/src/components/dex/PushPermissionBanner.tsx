import { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PushPermissionBannerProps {
  /** Additional CSS classes */
  className?: string;
  /** Position variant */
  variant?: 'banner' | 'card' | 'inline';
}

/**
 * Banner prompting users to enable push notifications
 * Shows only when:
 * - Push is supported
 * - Permission is 'prompt' (not yet asked)
 * - User hasn't dismissed it this session
 */
export function PushPermissionBanner({ className = '', variant = 'banner' }: PushPermissionBannerProps) {
  const { permission, isSupported, isSubscribed, subscribe, isLoading } = usePushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not supported, already subscribed, permission denied, or dismissed
  if (!isSupported || isSubscribed || permission === 'denied' || permission === 'granted' || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store in sessionStorage so it doesn't show again this session
    try {
      sessionStorage.setItem('push-banner-dismissed', 'true');
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Check if already dismissed this session
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem('push-banner-dismissed') === 'true') {
        return null;
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-4 border border-purple-500/30 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
            <BellIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm">Never miss a beat</h3>
            <p className="text-gray-400 text-xs mt-1">
              Get notified when your favorite artists drop new tracks
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-gray-400 hover:text-white text-xs font-medium transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <BellIcon className="w-4 h-4 text-purple-400" />
        <span className="text-gray-300 text-sm flex-1">Enable notifications?</span>
        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? '...' : 'Enable'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-400 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Default banner variant
  return (
    <div className={`bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BellIcon className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <p className="text-sm text-gray-200">
              <span className="font-medium text-white">Stay in the loop!</span>{' '}
              Get notified about new likes, comments, and followers.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
