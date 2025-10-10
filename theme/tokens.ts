// Design tokens for Stripe purple themed dashboard
export const colors = {
  bg: '#f7f8fb',          // app background (off-white)
  surface: '#ffffff',     // cards/toolbars
  border: '#e9eaf2',      // hairline
  text: '#0f172a',        // slate-900
  muted: '#64748b',       // slate-500/600

  brand: '#635BFF',       // Stripe purple
  brand600: '#4f46e5',
  brand700: '#4338ca',

  accentBlue: '#5b7cfd',
  accentViolet: '#944bff',
  accentTeal: '#23c6b7',
  danger: '#ef4444',
};

export const radii = {
  md: 12,
  lg: 16,
  xl: 20,     // primary card radius
  xxl: 28,
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

export const shadow = {
  card: {
    // soft shadow; on web add a boxShadow fallback via style prop
    elevation: 3,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
};

export const textSizes = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  h3: 22,     // dashboard section titles
  h2: 24,
};

/*
  DARK MODE PLAN (for future):
  Invert these tokens under a dark theme:
  - bg: '#0a0a0b'
  - surface: '#18181b'
  - border: '#27272a'
  - text: '#f8fafc'
  - muted: '#94a3b8'
  Keep brand colors the same or slightly brighter
*/
