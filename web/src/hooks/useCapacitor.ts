import { useEffect, useState } from 'react';

/**
 * Hook to detect if app is running in Capacitor native container
 * and apply appropriate CSS classes for safe area handling
 */
export const useCapacitor = () => {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    // Check if running in Capacitor
    const checkCapacitor = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Capacitor } = await import('@capacitor/core');

        const isNative = Capacitor.isNativePlatform();
        const currentPlatform = Capacitor.getPlatform();

        setIsCapacitor(isNative);
        setPlatform(currentPlatform as 'ios' | 'android' | 'web');

        // Apply CSS classes to html and body
        if (isNative) {
          document.documentElement.classList.add('capacitor-app');
          document.body.classList.add(`capacitor-${currentPlatform}`);

          // Also set a data attribute for CSS selectors
          document.documentElement.dataset.capacitor = currentPlatform;
        }

        // Configure status bar for iOS
        if (currentPlatform === 'ios') {
          try {
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            // Set status bar to NOT overlay the WebView content
            await StatusBar.setOverlaysWebView({ overlay: false });
            // Light text on dark background
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#000000' });
          } catch (e) {
            console.log('StatusBar not available:', e);
          }
        }

        // Configure status bar for Android
        if (currentPlatform === 'android') {
          try {
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#000000' });
          } catch (e) {
            console.log('StatusBar not available:', e);
          }
        }

        // Hide splash screen after app is ready
        if (isNative) {
          try {
            const { SplashScreen } = await import('@capacitor/splash-screen');
            await SplashScreen.hide();
          } catch (e) {
            console.log('SplashScreen not available');
          }
        }

      } catch (e) {
        // Not running in Capacitor
        setIsCapacitor(false);
        setPlatform('web');
      }
    };

    checkCapacitor();

    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('capacitor-app');
      document.body.classList.remove('capacitor-ios', 'capacitor-android', 'capacitor-web');
    };
  }, []);

  return { isCapacitor, platform };
};

export default useCapacitor;
