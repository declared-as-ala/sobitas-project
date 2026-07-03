export const theme = {
  colors: {
    primary: '#FF6B00',      // Protein.tn Premium Athletic Orange
    primaryHover: '#E05E00',
    secondary: '#121212',    // Deep Charcoal / Black
    background: '#F8F9FA',   // Light gray background
    card: '#FFFFFF',
    text: '#1E293B',         // Dark text
    textMuted: '#64748B',    // Gray text
    border: '#E2E8F0',       // Light border
    success: '#10B981',      // Emerald Green
    error: '#EF4444',        // Red
    warning: '#F59E0B',      // Amber
    white: '#FFFFFF',
    black: '#000000',
    orangeLight: '#FFF0E6',  // Accent background
    secondaryDark: '#0A0A0B',       // Deepest charcoal, for gradient bottoms
    glassBorder: 'rgba(255,255,255,0.14)',
    glassBorderDark: 'rgba(255,255,255,0.10)',
    overlayDark: 'rgba(0,0,0,0.55)',
  },
  gradients: {
    primary: ['#FF7A1A', '#FF6B00', '#E05100'] as const,
    dark: ['#232326', '#141416', '#0A0A0B'] as const,
    glassLight: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)'] as const,
    heroScrim: ['rgba(10,10,11,0.05)', 'rgba(10,10,11,0.85)'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 20,
    round: 999,
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      display: 32,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      bold: '700' as const,
      heavy: '900' as const,
    },
  },
  shadows: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
    heavy: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};
