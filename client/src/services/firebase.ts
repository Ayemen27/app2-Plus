import { initializeApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase config
const isFirebaseConfigValid = (): boolean => {
  return Object.values(firebaseConfig).every((value) => value && typeof value === 'string');
};

let app: ReturnType<typeof initializeApp> | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Initialize Firebase app and messaging service
 * Validates configuration and handles initialization errors
 */
export const initializeFirebase = (): void => {
  try {
    if (!isFirebaseConfigValid()) {
      console.warn('[Firebase] Invalid or missing Firebase configuration in environment variables');
      return;
    }

    if (!app) {
      app = initializeApp(firebaseConfig);
    }

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
  }
};

/**
 * Get Firebase Messaging instance
 * Ensures Firebase is initialized before returning instance
 */
export const getFirebaseMessaging = (): Messaging | null => {
  if (!messagingInstance) {
    initializeFirebase();
  }
  return messagingInstance;
};

/**
 * Get FCM token for push notifications
 * Requires valid VAPID key to be set in environment
 * With retry logic for transient failures
 */
export const getFirebaseToken = async (retryCount = 0): Promise<string | null> => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000 * (retryCount + 1); // Exponential backoff
  
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn('[Firebase] Firebase Messaging not initialized - skipping token request');
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[Firebase] VAPID key not configured - push notifications disabled');
      return null;
    }

    try {
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        console.log('[Firebase] Successfully obtained FCM token');
        return token;
      }
      return null;
    } catch (error: any) {
      // Check if this is a recoverable error
      if (error?.code === 'messaging/failed-service-worker-registration' && retryCount < MAX_RETRIES) {
        console.warn(`[Firebase] Service Worker registration failed, retrying in ${RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return getFirebaseToken(retryCount + 1);
      }
      
      // Log specific errors
      if (error?.code === 'messaging/unsupported-browser') {
        console.warn('[Firebase] Push notifications not supported in this browser');
      } else if (error?.code === 'messaging/permission-blocked') {
        console.warn('[Firebase] Push notification permission has been blocked');
      } else if (error?.code === 'messaging/service-worker-registration-failed') {
        console.warn('[Firebase] Service Worker registration failed');
      } else {
        console.error('[Firebase] Failed to get FCM token:', error?.message || error);
      }
      return null;
    }
  } catch (error) {
    console.error('[Firebase] Unexpected error in getFirebaseToken:', error);
    return null;
  }
};

/**
 * Set up message listener for incoming push notifications
 * Handles notification payload and triggers callback
 */
export const setupMessageListener = (
  callback: (payload: Record<string, any>) => void
): (() => void) | null => {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      throw new Error('Firebase Messaging not initialized');
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Firebase] Failed to set up message listener:', error);
    return null;
  }
};

export type { Messaging };
