import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeFirebase,
  getFirebaseToken,
  setupMessageListener,
  type Messaging,
} from '@/services/firebase';
import { useToast } from '@/hooks/use-toast';

interface UsePushReturn {
  isPushSupported: boolean;
  isPermissionGranted: boolean;
  isInitializing: boolean;
  error: string | null;
  requestPushPermission: () => Promise<boolean>;
  unsubscribe: (() => void) | null;
}

/**
 * Hook to manage Firebase Cloud Messaging push notifications
 * Handles permission requests, token management, and message handling
 */
export const usePush = (): UsePushReturn => {
  const { toast } = useToast();
  const [isPushSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        typeof Notification !== 'undefined'
      );
    } catch {
      return false;
    }
  });

  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return typeof Notification !== 'undefined' && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });

  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize Firebase and set up messaging listener
  useEffect(() => {
    const initializePush = async (): Promise<void> => {
      if (!isPushSupported) {
        setError('Push notifications are not supported in this browser');
        return;
      }

      try {
        setIsInitializing(true);
        initializeFirebase();

        // Set up message listener for foreground notifications
        const unsubscribe = setupMessageListener((payload) => {
          const notification = payload.notification;
          if (notification) {
            toast({
              title: notification.title || 'New Notification',
              description: notification.body,
            });
          }
        });

        if (unsubscribe) {
          unsubscribeRef.current = unsubscribe;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize push notifications';
        setError(errorMessage);
        console.error('[usePush] Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializePush();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isPushSupported, toast]);

  // Request push notification permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported) {
      const msg = 'المتصفح الحالي لا يدعم الإشعارات';
      setError(msg);
      console.warn('[usePush]', msg);
      return false;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Request notification permission
      if (typeof Notification === 'undefined') {
        setError('واجهة الإشعارات غير متاحة');
        return false;
      }

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setIsPermissionGranted(true);

        // Get FCM token after permission is granted
        const token = await getFirebaseToken();

        if (token) {
          // Send token to backend
          try {
            const response = await fetch('/api/push/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token }),
            });

            if (!response.ok) {
              throw new Error(`Failed to register token: ${response.statusText}`);
            }

            toast({
              title: 'Success',
              description: 'Push notifications enabled successfully',
            });

            // Store token in localStorage for reference
            localStorage.setItem('fcm_token', token);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to register push token';
            console.error('[usePush] Token registration error:', err);
            setError(errorMessage);
            return false;
          }
        } else {
          setError('Failed to generate FCM token');
          return false;
        }

        return true;
      } else if (permission === 'denied') {
        setError('Push notification permission denied by user');
        return false;
      } else {
        setError('Push notification permission dismissed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request push permission';
      setError(errorMessage);
      console.error('[usePush] Permission request error:', err);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [isPushSupported, toast]);

  return {
    isPushSupported,
    isPermissionGranted,
    isInitializing,
    error,
    requestPushPermission,
    unsubscribe: unsubscribeRef.current,
  };
};

export type { UsePushReturn };
