export const ENV = {
  isProduction: typeof window !== 'undefined' ? 
    (window.location.hostname === 'binarjoinanelytic.info' || window.location.hostname === 'www.binarjoinanelytic.info') : 
    process.env.NODE_ENV === 'production',
  isAndroid: typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:' ? false : true),
  
  getApiBaseUrl: () => {
    if (typeof window === 'undefined') return process.env.VITE_API_BASE_URL || '';
    
    // Check if running as Android app (Capacitor/Cordova)
    const isCapacitor = (window as any).Capacitor?.isNative;
    if (isCapacitor) {
      return import.meta.env.VITE_API_BASE_URL || 'https://app2.binarjoinanelytic.info';
    }

    // Default to relative for web to handle Replit proxy automatically
    return '';
  },

  getExternalServerUrl: () => {
    return 'https://app2.binarjoinanelytic.info';
  }
};
