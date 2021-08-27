import isBrowser from './isBrowser';

export const isSafari = isBrowser && navigator.userAgent.indexOf('Safari') !== -1;
