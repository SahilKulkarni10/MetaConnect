import { Platform } from 'react-native';

// Global theme constants for the app

// Font family definitions with system fallbacks
export const fonts = {
  // System font fallbacks for iOS and Android
  regular: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '400'
  },
  medium: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500'
  },
  semiBold: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600'
  },
  bold: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700'
  },
};

// Colors
export const colors = {
  primary: '#0284c7',
  secondary: '#4b5563',
  error: '#dc2626',
  success: '#16a34a',
  background: '#f0f4f8',
  card: '#ffffff',
  text: '#111827',
  border: '#e2e8f0',
  notification: '#ef4444',
};

// Spacing
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export default { fonts, colors, spacing }; 