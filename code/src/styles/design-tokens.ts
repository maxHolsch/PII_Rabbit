/**
 * PII Shield Design System
 * Central design tokens for consistent UI across the extension
 */

// ============================================
// COLOR SYSTEM
// ============================================

export const colors = {
  // Primary Indigo Palette
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5', // Main brand color
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Semantic Colors
  success: {
    light: '#10b981',
    DEFAULT: '#059669',
    dark: '#047857',
  },
  warning: {
    light: '#f59e0b',
    DEFAULT: '#d97706',
    dark: '#b45309',
  },
  error: {
    light: '#ef4444',
    DEFAULT: '#dc2626',
    dark: '#b91c1c',
  },
  info: {
    light: '#3b82f6',
    DEFAULT: '#2563eb',
    dark: '#1d4ed8',
  },

  // Entity Type Colors
  entity: {
    person: {
      light: '#60a5fa',
      DEFAULT: '#3b82f6',
      dark: '#2563eb',
    },
    location: {
      light: '#34d399',
      DEFAULT: '#10b981',
      dark: '#059669',
    },
    phone: {
      light: '#a78bfa',
      DEFAULT: '#8b5cf6',
      dark: '#7c3aed',
    },
    email: {
      light: '#c084fc',
      DEFAULT: '#a855f7',
      dark: '#9333ea',
    },
  },

  // Neutral Grays
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280', // WCAG AA compliant (4.6:1 on white)
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Contextual Colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  border: {
    light: '#e5e7eb',
    DEFAULT: '#d1d5db',
    dark: '#9ca3af',
  },
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    disabled: '#9ca3af',
  },
} as const;

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================

export const typography = {
  // Font Sizes (minimum 12px for accessibility)
  fontSize: {
    xs: '12px',    // Minimum readable size
    sm: '13px',    // Small text, hints
    base: '14px',  // Body text
    md: '15px',    // Emphasized body
    lg: '16px',    // Large body, inputs
    xl: '18px',    // Section headers
    '2xl': '20px', // Titles
    '3xl': '24px', // Large titles
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.01em',
  },
} as const;

// ============================================
// SPACING SYSTEM
// ============================================

export const spacing = {
  0: '0',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// ============================================
// TOUCH TARGETS
// ============================================

export const touchTargets = {
  // WCAG AAA minimum touch target size
  minimum: '44px',

  // Standard interactive elements
  button: {
    minHeight: '44px',
    minWidth: '44px',
  },
  icon: {
    minSize: '44px',
  },
  badge: {
    minHeight: '32px', // Smaller elements OK if not primary interaction
  },
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: 'none',

  // Focus shadows
  focus: '0 0 0 3px rgba(79, 70, 229, 0.1)',
  focusRing: '0 0 0 2px rgba(79, 70, 229, 0.5)',
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  // Durations
  duration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
    slower: '400ms',
  },

  // Easing functions
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Common transitions
  property: {
    all: 'all',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  popover: 1040,
  tooltip: 1050,
  modal: 1060,
  notification: 1070,
  max: 9999,
} as const;

// ============================================
// BREAKPOINTS (for responsive design)
// ============================================

export const breakpoints = {
  sm: '480px',  // Mobile
  md: '768px',  // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1920px', // Extra large
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get CSS color value from token path
 * @example getColor('primary', '600') => '#4f46e5'
 */
export const getColor = (category: keyof typeof colors, shade?: string): string => {
  const colorCategory = colors[category];
  if (typeof colorCategory === 'string') return colorCategory;
  if (shade && typeof colorCategory === 'object' && shade in colorCategory) {
    return (colorCategory as any)[shade];
  }
  return (colorCategory as any).DEFAULT || Object.values(colorCategory)[0];
};

/**
 * Create a transition CSS value
 * @example createTransition('all', 'fast') => 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)'
 */
export const createTransition = (
  property: keyof typeof transitions.property = 'all',
  duration: keyof typeof transitions.duration = 'DEFAULT',
  easing: keyof typeof transitions.easing = 'DEFAULT'
): string => {
  return `${transitions.property[property]} ${transitions.duration[duration]} ${transitions.easing[easing]}`;
};

/**
 * Create a media query for responsive design
 * @example createMediaQuery('md') => '@media (max-width: 768px)'
 */
export const createMediaQuery = (breakpoint: keyof typeof breakpoints): string => {
  return `@media (max-width: ${breakpoints[breakpoint]})`;
};

// Export all tokens as a single object for convenience
export const tokens = {
  colors,
  typography,
  spacing,
  touchTargets,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
} as const;

export default tokens;
