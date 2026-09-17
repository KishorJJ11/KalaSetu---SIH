// KalaSetu Design System
// Voice-first, high-contrast, warm-artisan visual identity.

export const COLORS = {
  primary: '#E65100', // Deep Artisan Orange
  primaryDark: '#BF360C',
  secondary: '#F57C00', // Warm Amber Orange
  secondaryLight: '#FF9800',
  accentGlow: '#FFB74D',

  background: '#FFFFFF',
  backgroundWarm: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#FFE0B2',

  textPrimary: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',

  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#F9A825',
  warningLight: '#FFF8E1',
  error: '#C62828',
  errorLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  overlay: 'rgba(33, 33, 33, 0.55)',
  shadow: '#000000',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const FONT = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 22,
    xl: 28,
    xxl: 34,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '800',
  },
};

export const SHADOW = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  raised: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const TOUCH_TARGET = {
  minHeight: 48,
  minWidth: 48,
};

const theme = { COLORS, SPACING, RADIUS, FONT, SHADOW, TOUCH_TARGET };
export default theme;
